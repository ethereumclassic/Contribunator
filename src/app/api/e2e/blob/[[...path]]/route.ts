import { NextRequest, NextResponse } from "next/server";

import { e2e } from "@/lib/env";

// An in-memory stand-in for the Vercel Blob API, for end-to-end tests only
// (NEXT_PUBLIC_VERCEL_BLOB_API_URL points the SDK here). It checks client
// tokens the way the real service does: pathname, content type, size and
// expiry. Files are served from /files/<pathname>, and /control lets tests
// inspect and change the state.

export const dynamic = "force-dynamic";

type Stored = {
  body: Buffer;
  contentType: string;
  uploadedAt: Date;
};
type Mpu = {
  pathname: string;
  contentType: string;
  parts: Map<number, Buffer>;
};

type State = {
  blobs: Map<string, Stored>;
  mpus: Map<string, Mpu>;
  partRequests: number;
  partsDone: number;
  /** delay every uploaded part, so a test can interrupt an upload */
  partDelayMs: number;
};

const g = globalThis as unknown as { __e2eBlob?: State };
const state: State = (g.__e2eBlob ||= {
  blobs: new Map(),
  mpus: new Map(),
  partRequests: 0,
  partsDone: 0,
  partDelayMs: 0,
});

const filesBase = () =>
  process.env.E2E_BLOB_PUBLIC_BASE ||
  "http://localhost:3000/api/e2e/blob/files/";

function blobError(code: string, message: string, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function describe(pathname: string, blob: Stored) {
  const url = filesBase() + pathname;
  return {
    url,
    downloadUrl: `${url}?download=1`,
    pathname,
    size: blob.body.length,
    contentType: blob.contentType,
    contentDisposition: `inline; filename="${pathname.split("/").pop()}"`,
    cacheControl: "public, max-age=2592000",
    uploadedAt: blob.uploadedAt.toISOString(),
    etag: `"${blob.body.length}"`,
  };
}

// what the token allows, or an error response
function authorizeWrite(req: NextRequest, pathname: string, size?: number) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer /, "");
  if (token.startsWith("vercel_blob_rw_")) return { allowOverwrite: true };
  if (!token.startsWith("vercel_blob_client_")) {
    return blobError("forbidden", "Access denied", 403);
  }
  const [, , , , encoded] = token.split("_");
  const payload = JSON.parse(
    Buffer.from(
      Buffer.from(encoded, "base64").toString().split(".")[1],
      "base64"
    ).toString()
  );
  if (payload.pathname !== pathname) {
    return blobError("client_token_pathname_mismatch", "pathname mismatch");
  }
  if (payload.validUntil < Date.now()) {
    return blobError("client_token_expired", "expired");
  }
  const type = req.headers.get("x-content-type") || "";
  if (
    payload.allowedContentTypes &&
    !payload.allowedContentTypes.includes(type)
  ) {
    return blobError("content_type_not_allowed", `${type} not allowed`);
  }
  if (size && payload.maximumSizeInBytes && size > payload.maximumSizeInBytes) {
    return blobError("file_too_large", "too large");
  }
  return { allowOverwrite: !!payload.allowOverwrite };
}

async function handle(req: NextRequest, path: string[]) {
  if (!e2e) return new NextResponse("Not found", { status: 404 });
  const [first, ...rest] = path;
  const search = req.nextUrl.searchParams;

  // serve files, with ranges for <video>
  if (first === "files" && req.method === "GET") {
    const blob = state.blobs.get(decodeURIComponent(rest.join("/")));
    if (!blob) return new NextResponse("Not found", { status: 404 });
    const range = req.headers.get("range")?.match(/bytes=(\d+)-(\d*)/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Number(range[2]) : blob.body.length - 1;
      return new NextResponse(blob.body.subarray(start, end + 1), {
        status: 206,
        headers: {
          "content-type": blob.contentType,
          "content-range": `bytes ${start}-${end}/${blob.body.length}`,
          "accept-ranges": "bytes",
        },
      });
    }
    return new NextResponse(blob.body, {
      headers: { "content-type": blob.contentType, "accept-ranges": "bytes" },
    });
  }

  // test controls
  if (first === "control") {
    if (req.method === "POST") {
      const body = await req.json();
      if (body.reset) {
        state.blobs.clear();
        state.mpus.clear();
        state.partRequests = 0;
        state.partsDone = 0;
        state.partDelayMs = 0;
      }
      if (body.partDelayMs !== undefined) state.partDelayMs = body.partDelayMs;
      if (body.put) {
        // { put: { pathname, contentType, text } } adds a file directly
        state.blobs.set(body.put.pathname, {
          body: Buffer.from(body.put.text || "x"),
          contentType: body.put.contentType || "video/mp4",
          uploadedAt: new Date(),
        });
      }
      if (body.age) {
        // { age: { pathname: days } } backdates uploads
        Object.entries(body.age as Record<string, number>).forEach(
          ([p, days]) => {
            const blob = state.blobs.get(p);
            if (blob) blob.uploadedAt = new Date(Date.now() - days * 86400000);
          }
        );
      }
    }
    return NextResponse.json({
      blobs: Array.from(state.blobs.entries()).map(([p, b]) => describe(p, b)),
      mpus: state.mpus.size,
      partRequests: state.partRequests,
      partsDone: state.partsDone,
    });
  }

  // put
  if (req.method === "PUT" && !first) {
    const pathname = search.get("pathname") || "";
    const body = Buffer.from(await req.arrayBuffer());
    const allowed = authorizeWrite(req, pathname, body.length);
    if (allowed instanceof NextResponse) return allowed;
    const overwrite =
      allowed.allowOverwrite || req.headers.get("x-allow-overwrite") === "1";
    if (state.blobs.has(pathname) && !overwrite) {
      return blobError("bad_request", "This blob already exists");
    }
    const stored = {
      body,
      contentType:
        req.headers.get("x-content-type") || "application/octet-stream",
      uploadedAt: new Date(),
    };
    state.blobs.set(pathname, stored);
    return NextResponse.json(describe(pathname, stored));
  }

  // multipart
  if (req.method === "POST" && first === "mpu") {
    const pathname = search.get("pathname") || "";
    const action = req.headers.get("x-mpu-action");
    if (action === "create") {
      const allowed = authorizeWrite(req, pathname);
      if (allowed instanceof NextResponse) return allowed;
      const uploadId = Math.random().toString(36).slice(2);
      state.mpus.set(uploadId, {
        pathname,
        contentType: req.headers.get("x-content-type") || "",
        parts: new Map(),
      });
      return NextResponse.json({ uploadId, key: `key-${uploadId}` });
    }
    const uploadId = req.headers.get("x-mpu-upload-id") || "";
    const mpu = state.mpus.get(uploadId);
    if (!mpu)
      return blobError("not_found", "The requested blob does not exist", 404);
    if (action === "upload") {
      state.partRequests++;
      const body = Buffer.from(await req.arrayBuffer());
      const allowed = authorizeWrite(req, pathname);
      if (allowed instanceof NextResponse) return allowed;
      if (state.partDelayMs) {
        await new Promise((r) => setTimeout(r, state.partDelayMs));
      }
      const partNumber = Number(req.headers.get("x-mpu-part-number"));
      mpu.parts.set(partNumber, body);
      state.partsDone++;
      return NextResponse.json({ etag: `etag-${partNumber}`, partNumber });
    }
    if (action === "complete") {
      const allowed = authorizeWrite(req, pathname);
      if (allowed instanceof NextResponse) return allowed;
      const parts: { partNumber: number }[] = await req.json();
      const body = Buffer.concat(
        parts.map((p) => mpu.parts.get(p.partNumber)!)
      );
      const stored = {
        body,
        contentType: mpu.contentType,
        uploadedAt: new Date(),
      };
      state.blobs.set(pathname, stored);
      state.mpus.delete(uploadId);
      return NextResponse.json(describe(pathname, stored));
    }
  }

  // delete
  if (req.method === "POST" && first === "delete") {
    const { urls } = await req.json();
    (urls as string[]).forEach((url) =>
      state.blobs.delete(url.replace(filesBase(), ""))
    );
    return NextResponse.json({});
  }

  // head / list
  if (req.method === "GET" && !first) {
    const url = search.get("url");
    if (url) {
      const pathname = url.startsWith(filesBase())
        ? url.slice(filesBase().length)
        : url;
      const blob = state.blobs.get(pathname);
      if (!blob)
        return blobError("not_found", "The requested blob does not exist", 404);
      return NextResponse.json(describe(pathname, blob));
    }
    const prefix = search.get("prefix") || "";
    const blobs = Array.from(state.blobs.entries())
      .filter(([p]) => p.startsWith(prefix))
      .map(([p, b]) => describe(p, b));
    return NextResponse.json({ blobs, hasMore: false });
  }

  return blobError("bad_request", `Unhandled ${req.method} ${path.join("/")}`);
}

type Ctx = { params: { path?: string[] } };
export const GET = (req: NextRequest, { params }: Ctx) =>
  handle(req, params.path || []);
export const PUT = (req: NextRequest, { params }: Ctx) =>
  handle(req, params.path || []);
export const POST = (req: NextRequest, { params }: Ctx) =>
  handle(req, params.path || []);
