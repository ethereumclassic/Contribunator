import { NextRequest, NextResponse } from "next/server";
import { createAppAuth } from "@octokit/auth-app";
import { del, list } from "@vercel/blob";

import type { Config, Repo } from "@/types";

import getConfig from "@/lib/config";
import log from "@/lib/log";
import { githubApp } from "@/lib/env.server";
import Octokit from "@/lib/server/octokit";
import { MANIFEST_PREFIX, UPLOAD_PREFIX, blobToken } from "@/lib/server/blob";
import type { Manifest } from "@/lib/server/verifyMedia";

// Called daily by Vercel Cron (see vercel.json). Deletes uploads from the
// Blob store that are no longer needed:
//
// - used by an open pull request: kept
// - used by a merged pull request: kept for `media.retentionDays` after
//   upload (null = forever)
// - anything else (closed pull request, form never submitted): deleted after
//   `media.orphanGraceDays`
//
// Which upload belongs to which pull request is recorded in a manifest when
// the pull request is created. `?dry=1` reports without deleting.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DAY = 24 * 3600 * 1000;
const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_GRACE_DAYS = 7;

type PrState = "open" | "merged" | "closed" | "none";
const STRENGTH: Record<PrState, number> = {
  open: 3,
  merged: 2,
  closed: 1,
  none: 0,
};

async function listAll(prefix: string) {
  const blobs = [];
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix,
      cursor,
      limit: 1000,
      token: blobToken(),
    });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

function retentionOf(config: Config, repo?: Repo) {
  const media = { ...config.media, ...repo?.media };
  return {
    retentionDays:
      media.retentionDays === undefined
        ? DEFAULT_RETENTION_DAYS
        : media.retentionDays,
    graceDays: media.orphanGraceDays ?? DEFAULT_GRACE_DAYS,
  };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ skipped: "no blob store" });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const config = await getConfig();
  const octokit = new Octokit({ authStrategy: createAppAuth, auth: githubApp });
  const now = Date.now();

  // which uploads are used where
  const used = new Map<string, { state: PrState; repo?: Repo }>();
  const manifests = await listAll(MANIFEST_PREFIX);
  const manifestStates = new Map<string, PrState>();
  for (const blob of manifests) {
    let manifest: Manifest;
    try {
      manifest = await (await fetch(blob.url, { cache: "no-store" })).json();
    } catch {
      log.warn("unreadable media manifest", { pathname: blob.pathname });
      continue;
    }
    const repo = config.repos[manifest.repo];
    let state: PrState = "none";
    if (repo) {
      try {
        const { data } = await octokit.request(
          "GET /repos/{owner}/{repo}/pulls",
          {
            owner: repo.owner,
            repo: repo.name,
            head: `${repo.owner}:${manifest.branch}`,
            state: "all",
          }
        );
        // the branch's newest pull request decides
        const pr = data[0];
        if (pr)
          state = pr.merged_at
            ? "merged"
            : pr.state === "open"
            ? "open"
            : "closed";
      } catch (err) {
        // when GitHub can't be asked, keep everything this manifest lists
        log.warn("media cleanup: pull request lookup failed", {
          branch: manifest.branch,
          error: err instanceof Error ? err.message : String(err),
        });
        state = "open";
      }
    }
    manifestStates.set(blob.pathname, state);
    for (const pathname of manifest.uploads || []) {
      const current = used.get(pathname);
      if (!current || STRENGTH[state] > STRENGTH[current.state]) {
        used.set(pathname, { state, repo });
      }
    }
  }

  // decide for every upload
  const uploads = await listAll(UPLOAD_PREFIX);
  const remove: string[] = [];
  const kept = { open: 0, merged: 0, recent: 0 };
  for (const blob of uploads) {
    const ageDays = (now - new Date(blob.uploadedAt).getTime()) / DAY;
    const use = used.get(blob.pathname);
    const { retentionDays, graceDays } = retentionOf(config, use?.repo);
    if (use?.state === "open") {
      kept.open++;
    } else if (use?.state === "merged") {
      if (retentionDays !== null && ageDays > retentionDays) {
        remove.push(blob.url);
      } else {
        kept.merged++;
      }
    } else if (ageDays > graceDays) {
      remove.push(blob.url);
    } else {
      kept.recent++;
    }
  }

  // manifests of pull requests that will never need their files again
  const { graceDays } = retentionOf(config);
  for (const blob of manifests) {
    const state = manifestStates.get(blob.pathname);
    const ageDays = (now - new Date(blob.uploadedAt).getTime()) / DAY;
    if ((state === "closed" || state === "none") && ageDays > graceDays) {
      remove.push(blob.url);
    }
  }

  if (!dry) {
    for (let i = 0; i < remove.length; i += 500) {
      await del(remove.slice(i, i + 500), { token: blobToken() });
    }
  }
  log.info("media cleanup", { dry, deleted: remove.length, kept });
  return NextResponse.json({ dry, deleted: remove, kept });
}
