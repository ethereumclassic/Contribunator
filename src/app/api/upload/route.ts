import { NextRequest, NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { issueSignedToken, presignUrl } from "@vercel/blob";

import getConfig from "@/lib/config";
import log from "@/lib/log";
import authorize from "@/lib/server/authorize";
import { auth } from "@/lib/env.server";
import { blobPublicBase, blobToken, UPLOAD_PREFIX } from "@/lib/server/blob";
import {
  createSession,
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  UploadSession,
} from "@/lib/server/uploadSession";
import { mediaRules } from "@/lib/media/rules";
import {
  EXTENSIONS,
  contentTypeOfName,
  formatBytes,
  kindOfContentType,
} from "@/lib/media/media";
import slugify from "@/lib/helpers/slugify";

// Uploads go from the browser straight to the Blob store; this route only
// hands out what the browser needs:
//
//   { action: "session", repo, contribution, authorization, captcha? }
//     checks the same authorization as a submission and sets the signed
//     upload session cookie
//   { action: "token", repo, contribution, field, name, size, contentType,
//     pathname? }
//     a short lived client token for one file, for the Blob SDK (the form
//     uses it). `pathname` resumes an upload this session started earlier.
//   { action: "presign", repo, contribution, field, name, contentType? }
//     a presigned URL that accepts the file with one plain HTTP PUT, and the
//     media item to submit afterwards: for scripts and agents that can't use
//     the SDK or host the file somewhere.
//
// Browsers use the upload session cookie; scripts send an `x-api-key`
// header instead (when the repository allows API authorization).

export const dynamic = "force-dynamic";

const TOKEN_MINUTES = 60;

// an API key stands in for the session cookie; its uploads share a folder
function apiKeySession(
  req: NextRequest,
  authorization: string[]
): UploadSession | undefined {
  const key = req.headers.get("x-api-key");
  const user = key && auth.api.keys?.[key];
  if (!user || !authorization.includes("api")) return;
  return {
    sid: `api-${slugify(user, false)}`,
    auth: "api",
    exp: Date.now() + TOKEN_MINUTES * 60 * 1000,
  };
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request");
  }
  try {
    const config = await getConfig(body.repo, body.contribution);

    if (body.action === "session") {
      const authorized = await authorize({ req, body, config });
      const { session, cookie } = createSession(
        authorized.type,
        readSession(req)?.sid
      );
      log.info("upload session", { auth: authorized.type, sid: session.sid });
      const res = NextResponse.json({ expires: session.exp });
      res.cookies.set(SESSION_COOKIE, cookie, sessionCookieOptions());
      return res;
    }

    if (body.action === "token" || body.action === "presign") {
      const session =
        readSession(req) || apiKeySession(req, config.repo.authorization);
      if (!session) {
        return fail(
          req.headers.get("x-api-key")
            ? "Invalid API key"
            : "Upload session expired",
          401
        );
      }
      if (!config.repo.authorization.includes(session.auth)) {
        return fail("Unauthorized", 401);
      }
      const rules = mediaRules(config, body.field);
      if (rules.storage !== "blob") return fail("Uploads are not enabled");
      const name = String(body.name || "file");
      const contentType = String(
        body.contentType || contentTypeOfName(name) || ""
      ).toLowerCase();
      if (!rules.contentTypes.includes(contentType)) {
        return fail(`Unsupported file type ${contentType || "(unknown)"}`);
      }
      // presigned uploads are limited by the store, the size is optional
      const size = Number(body.size);
      if (
        (body.action === "token" || body.size !== undefined) &&
        (!(size > 0) || size > rules.maxBytes)
      ) {
        return fail(`Files must be up to ${formatBytes(rules.maxBytes)}`);
      }

      // the server decides where files go; resuming may only reuse a
      // pathname from this same session
      const own = `${UPLOAD_PREFIX}${session.sid}/`;
      let pathname: string;
      if (body.pathname) {
        pathname = String(body.pathname);
        if (!pathname.startsWith(own) || pathname.includes("..")) {
          return fail("Cannot resume this upload", 403);
        }
      } else {
        const base = slugify(name.replace(/\.[^.]*$/, "")) || "file";
        const id = Math.random().toString(36).slice(2, 10);
        pathname = `${own}${id}/${base.slice(0, 60)}.${
          EXTENSIONS[contentType]
        }`;
      }
      const validUntil = Date.now() + TOKEN_MINUTES * 60 * 1000;
      // the URL the file will have
      const url = blobPublicBase() + pathname;

      if (body.action === "presign") {
        const signed = await issueSignedToken({
          token: blobToken(),
          pathname,
          operations: ["put"],
          validUntil,
          allowedContentTypes: [contentType],
          maximumSizeInBytes: rules.maxBytes,
        });
        const { presignedUrl } = await presignUrl(signed, {
          operation: "put",
          pathname,
          access: "public",
          allowedContentTypes: [contentType],
          maximumSizeInBytes: rules.maxBytes,
          addRandomSuffix: false,
          validUntil: signed.validUntil,
        });
        log.info("presigned upload", { pathname, auth: session.auth });
        return NextResponse.json({
          method: "PUT",
          uploadUrl: presignedUrl,
          expires: new Date(signed.validUntil).toISOString(),
          maxBytes: rules.maxBytes,
          url,
          // submit this as the field's value once the PUT succeeded
          item: {
            url,
            source: "upload",
            kind: kindOfContentType(contentType),
            contentType,
            name,
          },
        });
      }

      const token = await generateClientTokenFromReadWriteToken({
        token: blobToken(),
        pathname,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: rules.maxBytes,
        validUntil,
        addRandomSuffix: false,
      });
      return NextResponse.json({ token, pathname, url });
    }

    return fail("Unknown action");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("upload route", { message });
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
