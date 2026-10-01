// Shared (client + server) rules for uploaded and linked media.

export type MediaKind = "image" | "video";

/**
 * A media item in the form data. Uploaded files live in the Vercel Blob
 * store; linked files are anywhere the field's `remoteUrl` option allows.
 */
export type MediaItem = {
  url: string;
  source: "upload" | "remote";
  kind: MediaKind;
  contentType?: string;
  size?: number;
  /** original file name, shown in the form */
  name?: string;
  alt?: string;
};

/**
 * Which remote hosts a field accepts links from: `false` (uploads only),
 * `true` (any public https host) or a list of hosts, where `*.example.com`
 * matches subdomains.
 */
export type RemoteUrlOption = boolean | string[];

export const MB = 1048576;

// sent as the captcha response when the captcha was already solved to start
// an upload session; the server checks the session cookie instead
export const CAPTCHA_FROM_SESSION = "upload-session";

export const MEDIA_TYPES: Record<MediaKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  // twitter-together only publishes mp4 video
  video: ["video/mp4"],
};

// what X accepts; fields may set lower limits
export const MAX_SIZE_MB: Record<MediaKind, number> = {
  image: 5,
  video: 512,
};

export const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
};

export function kindOfContentType(contentType?: string) {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  return (Object.keys(MEDIA_TYPES) as MediaKind[]).find((kind) =>
    MEDIA_TYPES[kind].includes(type)
  );
}

export function hostMatches(host: string, pattern: string) {
  const h = host.toLowerCase();
  const p = pattern.toLowerCase().trim();
  if (p === "*") return true;
  if (p.startsWith("*.")) return h.endsWith(p.slice(1));
  return h === p;
}

/**
 * Returns an error message, or `undefined` when the link is acceptable.
 * Only checks the URL itself; the server also checks what it points to.
 */
export function checkRemoteUrl(
  value: string,
  option: RemoteUrlOption | undefined
): string | undefined {
  if (!option) return "Links are not allowed, please upload the file";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Must be a valid URL";
  }
  if (url.protocol !== "https:") return "Must be an https:// link";
  if (url.username || url.password) return "Must not contain credentials";
  if (Array.isArray(option) && !option.some((p) => hostMatches(url.host, p))) {
    return `Links must be on ${option.join(", ")}`;
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * MB) {
    const mb = bytes / MB;
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  return `${(bytes / 1024 / MB).toFixed(2)} GB`;
}
