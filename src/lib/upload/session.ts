import { CAPTCHA_FROM_SESSION } from "@/lib/media/media";

// Starts an upload session (see /api/upload). The browser keeps it as an
// http-only cookie; this module only remembers that one exists.

export class NeedCaptchaError extends Error {
  constructor() {
    super("Please complete the CAPTCHA to upload files");
  }
}

let active: Promise<void> | undefined;

export function startUploadSession({
  repo,
  contribution,
  authorization,
  captcha,
  setCaptcha,
}: {
  repo: string;
  contribution: string;
  authorization: string;
  captcha?: string;
  /** called with CAPTCHA_FROM_SESSION once a solved captcha was used up */
  setCaptcha: (value: string) => void;
}): Promise<void> {
  // no captcha yet: maybe a session from before a reload is still valid
  const fromCookie = authorization === "captcha" && !captcha;
  if (fromCookie) captcha = CAPTCHA_FROM_SESSION;
  if (captcha === CAPTCHA_FROM_SESSION && active) return active;
  if (authorization !== "captcha" && active) return active;

  active = fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "session",
      repo,
      contribution,
      authorization,
      // CAPTCHA_FROM_SESSION renews an existing session cookie
      captcha,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      active = undefined;
      const json = await res.json().catch(() => ({}));
      if (authorization === "captcha") {
        // hCaptcha responses are single use
        setCaptcha("");
        throw new NeedCaptchaError();
      }
      throw new Error(json.error || "Could not start uploading");
    }
    if (authorization === "captcha") setCaptcha(CAPTCHA_FROM_SESSION);
  });
  return active;
}

/** forget the session, e.g. when the server says it expired */
export function resetUploadSession() {
  active = undefined;
}
