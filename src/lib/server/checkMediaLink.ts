import { head } from "@vercel/blob";

import { e2e } from "@/lib/env";
import {
  MediaItem,
  checkRemoteUrl,
  formatBytes,
  kindOfContentType,
} from "@/lib/media/media";
import type { MediaRules } from "@/lib/media/rules";

import { blobToken, uploadPathname } from "./blob";
import safeHead from "./safeHead";

type Checked = Pick<MediaItem, "url" | "contentType" | "size" | "kind">;

function checkType(
  contentType: string | undefined,
  size: number | undefined,
  rules: MediaRules
) {
  const kind = kindOfContentType(contentType);
  if (!kind || !rules.kinds.includes(kind)) {
    throw new Error(
      `Unsupported file type ${
        contentType || "(unknown)"
      }, expected ${rules.kinds.join(" or ")}`
    );
  }
  if (size && size > rules.maxBytes) {
    throw new Error(
      `File is too big (${formatBytes(size)}), the limit is ${formatBytes(
        rules.maxBytes
      )}`
    );
  }
  return kind;
}

/** a link the user typed in: allowed host, public address, right type */
export default async function checkMediaLink(
  url: string,
  rules: MediaRules
): Promise<Checked> {
  const error = checkRemoteUrl(url, rules.remoteUrl);
  if (error) throw new Error(error);
  // e2e tests can't reach the internet: links on example.com are faked
  if (e2e && new URL(url).host.endsWith("example.com")) {
    const contentType = url.endsWith(".mp4") ? "video/mp4" : "image/png";
    const size = url.includes("huge") ? 1024 * 1024 * 1024 : 1234;
    return {
      url,
      contentType,
      size,
      kind: checkType(contentType, size, rules),
    };
  }
  const res = await safeHead(url);
  const kind = checkType(res.contentType, res.size, rules);
  // keep the link as given; redirects are followed again when publishing
  return { url, contentType: res.contentType, size: res.size, kind };
}

/** a file uploaded to our blob store */
export async function checkUpload(
  url: string,
  rules: MediaRules
): Promise<Checked> {
  const pathname = uploadPathname(url);
  if (!pathname) throw new Error("Uploaded file is not in this site's storage");
  const blob = await head(url, { token: blobToken() }).catch(() => null);
  if (!blob)
    throw new Error("Uploaded file was not found, please upload it again");
  const kind = checkType(blob.contentType, blob.size, rules);
  return {
    url: blob.url,
    contentType: blob.contentType,
    size: blob.size,
    kind,
  };
}
