import { NextRequest, NextResponse } from "next/server";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

import getConfig from "@/lib/config";
import log from "@/lib/log";
import authorize from "@/lib/server/authorize";
import { blobPublicBase, blobToken, UPLOAD_PREFIX } from "@/lib/server/blob";
import {
  createSession,
  readSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/server/uploadSession";
import { mediaRules } from "@/lib/media/rules";
import { EXTENSIONS, formatBytes } from "@/lib/media/media";
import slugify from "@/lib/helpers/slugify";

// Uploads go from the browser straight to the Blob store; this route only
// hands out what the browser needs:
//
//   { action: "session", repo, contribution, authorization, captcha? }
//     checks the same authorization as a submission and sets the signed
//     upload session cookie
//   { action: "token", repo, contribution, field, name, size, contentType,
//     pathname? }
//     a short lived client token for one file. `pathname` resumes an
//     upload this session started earlier.

export const dynamic = "force-dynamic";

const TOKEN_MINUTES = 60;

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

    if (body.action === "token") {
      const session = readSession(req);
      if (!session) return fail("Upload session expired", 401);
      if (!config.repo.authorization.includes(session.auth)) {
        return fail("Unauthorized", 401);
      }
      const rules = mediaRules(config, body.field);
      if (rules.storage !== "blob") return fail("Uploads are not enabled");
      const contentType = String(body.contentType || "").toLowerCase();
      if (!rules.contentTypes.includes(contentType)) {
        return fail(`Unsupported file type ${contentType || "(unknown)"}`);
      }
      const size = Number(body.size);
      if (!(size > 0) || size > rules.maxBytes) {
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
        const base =
          slugify(String(body.name || "file").replace(/\.[^.]*$/, "")) ||
          "file";
        const id = Math.random().toString(36).slice(2, 10);
        pathname = `${own}${id}/${base.slice(0, 60)}.${
          EXTENSIONS[contentType]
        }`;
      }

      const token = await generateClientTokenFromReadWriteToken({
        token: blobToken(),
        pathname,
        allowedContentTypes: [contentType],
        maximumSizeInBytes: rules.maxBytes,
        validUntil: Date.now() + TOKEN_MINUTES * 60 * 1000,
        addRandomSuffix: false,
      });
      // the URL the file will have, for when a retried upload finds it
      // already finished
      const url = blobPublicBase() + pathname;
      return NextResponse.json({ token, pathname, url });
    }

    return fail("Unknown action");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    log.error("upload route", { message });
    return fail(message, message === "Unauthorized" ? 401 : 400);
  }
}
