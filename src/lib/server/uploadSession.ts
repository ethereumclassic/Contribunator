import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

import type { AuthType } from "@/types";

// An upload session is a signed cookie handed out after the same check a
// submission goes through (GitHub login, API key or captcha). Uploads happen
// before the form is submitted, so the session lets a captcha user upload
// several files, resume them, and then submit, after solving one captcha.

export const SESSION_COOKIE = "c11r_upload";
export const SESSION_HOURS = 12;

export type UploadSession = {
  /** random id, uploads are stored under uploads/<sid>/ */
  sid: string;
  auth: AuthType;
  /** expiry, ms since epoch */
  exp: number;
};

function secret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is required for uploads");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret())
    .update(`upload-session:${payload}`)
    .digest("base64url");
}

export function createSession(
  auth: AuthType,
  // keep the id of a still valid session, so its uploads can be resumed
  sid?: string
): {
  session: UploadSession;
  cookie: string;
} {
  const session = {
    sid: sid || randomBytes(12).toString("base64url"),
    auth,
    exp: Date.now() + SESSION_HOURS * 3600 * 1000,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { session, cookie: `${payload}.${sign(payload)}` };
}

export function readSession(req: NextRequest): UploadSession | undefined {
  const value = req.cookies.get(SESSION_COOKIE)?.value;
  if (!value) return;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    return;
  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as UploadSession;
    if (!session.sid || session.exp < Date.now()) return;
    return session;
  } catch {
    return;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: SESSION_HOURS * 3600,
  };
}
