import { put } from "@vercel/blob";

import type { ConfigWithContribution } from "@/types";

import { allMediaRules } from "@/lib/media/rules";
import log from "@/lib/log";

import checkMediaLink, { checkUpload } from "./checkMediaLink";
import { MANIFEST_PREFIX, blobToken, uploadPathname } from "./blob";

/**
 * Re-checks every uploaded or linked file of a submission on the server, and
 * replaces the type and size the browser reported with what was found.
 * Returns the store pathnames of the uploads it uses.
 */
export async function verifyMedia(
  config: ConfigWithContribution,
  body: any
): Promise<string[]> {
  const uploads: string[] = [];
  for (const rules of allMediaRules(config)) {
    const value = body[rules.field];
    if (!value) continue;
    const items: any[] = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (!item?.url) continue; // an image kept in the repository
      if (item.source !== "remote" && rules.storage !== "blob") {
        throw new Error(`${rules.field} does not accept uploads`);
      }
      const checked =
        item.source === "remote"
          ? await checkMediaLink(item.url, rules)
          : await checkUpload(item.url, rules);
      Object.assign(item, checked);
      if (item.source !== "remote") uploads.push(uploadPathname(item.url)!);
    }
  }
  return uploads;
}

export type Manifest = {
  repo: string;
  branch: string;
  uploads: string[];
  created: string;
};

export function manifestPathname(repo: string, branch: string) {
  return `${MANIFEST_PREFIX}${repo}/${branch}.json`;
}

/**
 * Records which uploads a pull request branch uses, before the pull request
 * is created. The cleanup cron keeps uploads that belong to an open or merged
 * pull request and deletes the rest after a grace period.
 */
export async function writeManifest(manifest: Omit<Manifest, "created">) {
  const pathname = manifestPathname(manifest.repo, manifest.branch);
  await put(
    pathname,
    JSON.stringify({ ...manifest, created: new Date().toISOString() }),
    {
      access: "public",
      token: blobToken(),
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    }
  );
  log.info("media manifest", { pathname, uploads: manifest.uploads.length });
}
