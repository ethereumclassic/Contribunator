import { NextRequest, NextResponse } from "next/server";
import { createAppAuth } from "@octokit/auth-app";

import type { Repo } from "@/types";

import getConfig from "@/lib/config";
import log from "@/lib/log";
import { githubApp } from "@/lib/env.server";
import Octokit from "@/lib/server/octokit";

// Called by Vercel Cron (see vercel.json). Looks at every configured
// repository for scheduled tweets that are due, and asks the repository's
// "Publish scheduled tweets" workflow to run when there are any. Publishing
// itself, and the X credentials, stay in the repository.
//
// The ledger is written by the twitter-together action: "pending" entries are
// queued when a scheduled tweet is merged; anything else is already handled.
// Firing the workflow needs only `contents: write`, which the app has.

export const dynamic = "force-dynamic";

// the action keeps the ledger on its own branch, so that a protected default
// branch (pull requests only) does not block the workflow from writing it
const LEDGER_PATH = ".github/published-tweets.json";
const LEDGER_BRANCH = "published-tweets";
const EVENT_TYPE = "publish-scheduled-tweets";

type LedgerEntry = { status: string; scheduled?: string };
type Ledger = { [filename: string]: LedgerEntry };

type RepoResult = {
  repo: string;
  ledger: boolean;
  due: string[];
  dispatched: boolean;
  error?: string;
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    log.error("CRON_SECRET is not configured, refusing to run");
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getConfig();
  const octokit = new Octokit({ authStrategy: createAppAuth, auth: githubApp });
  const now = new Date();

  const repos: RepoResult[] = [];
  for (const repo of Object.values(config.repos)) {
    repos.push(await checkRepo(octokit, repo, now));
  }

  log.info("publish-scheduled cron", { repos });
  return NextResponse.json({ checkedAt: now.toISOString(), repos });
}

async function checkRepo(
  octokit: InstanceType<typeof Octokit>,
  repo: Repo,
  now: Date
): Promise<RepoResult> {
  const name = `${repo.owner}/${repo.name}`;
  const result: RepoResult = {
    repo: name,
    ledger: false,
    due: [],
    dispatched: false,
  };
  try {
    let ledger: Ledger;
    try {
      const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        {
          owner: repo.owner,
          repo: repo.name,
          path: LEDGER_PATH,
          ref: LEDGER_BRANCH,
          headers: { "cache-control": "no-cache" },
        }
      );
      ledger = JSON.parse(
        Buffer.from((data as { content: string }).content, "base64").toString(
          "utf8"
        )
      );
    } catch (err) {
      // no ledger means the repository does not use scheduled tweets
      if ((err as { status?: number }).status === 404) return result;
      throw err;
    }
    result.ledger = true;

    result.due = Object.entries(ledger)
      .filter(
        ([, entry]) =>
          entry.status === "pending" &&
          !!entry.scheduled &&
          new Date(entry.scheduled) <= now
      )
      .map(([filename]) => filename)
      .sort();

    if (result.due.length === 0) return result;

    await octokit.request("POST /repos/{owner}/{repo}/dispatches", {
      owner: repo.owner,
      repo: repo.name,
      event_type: EVENT_TYPE,
      client_payload: { due: result.due, checkedAt: now.toISOString() },
    });
    result.dispatched = true;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    log.error(`publish-scheduled cron failed for ${name}: ${result.error}`);
  }
  return result;
}
