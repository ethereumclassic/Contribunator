import { e2e, isServer } from "@/lib/env";

export type TweetLookup = {
  id: string;
  username: string;
  mentions: string[];
};

// X's syndication endpoint (used by embedded timelines and the react-tweet
// library) returns public post data without API credentials. The token is
// derived from the id; this is the same derivation react-tweet uses.
// It is not officially documented, so failures are treated as "unknown",
// never as "invalid".
export function syndicationToken(id: string) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

// canned data for end-to-end tests
const E2E_POSTS: { [id: string]: TweetLookup | null } = {
  "404": null,
  "1001": { id: "1001", username: "eth_classic", mentions: [] },
  "1002": { id: "1002", username: "someone", mentions: ["eth_classic"] },
};

export async function fetchTweetFromSyndication(
  id: string
): Promise<TweetLookup | null> {
  if (e2e) {
    return id in E2E_POSTS
      ? E2E_POSTS[id]
      : { id, username: "test", mentions: [] };
  }
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(
    id
  )}&token=${syndicationToken(id)}`;
  const res = await fetch(url, {
    headers: { "user-agent": "contribunator" },
    next: { revalidate: 300 },
  } as RequestInit);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lookup failed with status ${res.status}`);
  const data = await res.json();
  // deleted / protected posts come back as a tombstone or an empty object
  if (!data || data.__typename !== "Tweet" || !data.user) return null;
  return {
    id: data.id_str || id,
    username: data.user.screen_name,
    mentions: (data.entities?.user_mentions || [])
      .map((m: { screen_name?: string }) => m.screen_name)
      .filter(Boolean),
  };
}

const cache = new Map<string, Promise<TweetLookup | null>>();

/**
 * Look up a public post by id. Resolves `null` when the post does not exist
 * (deleted, protected or never existed). Rejects on network errors.
 * Results are memoized for the lifetime of the page / server process.
 */
export function lookupTweet(id: string): Promise<TweetLookup | null> {
  let pending = cache.get(id);
  if (!pending) {
    pending = isServer
      ? fetchTweetFromSyndication(id)
      : fetch(`/api/tweet-lookup?id=${encodeURIComponent(id)}`).then(
          async (res) => {
            if (!res.ok)
              throw new Error(`Lookup failed with status ${res.status}`);
            const json = await res.json();
            return json.found ? (json.post as TweetLookup) : null;
          }
        );
    // don't cache failures
    pending.catch(() => cache.delete(id));
    cache.set(id, pending);
  }
  return pending;
}

export type QuoteKind = "reply" | "quote" | "retweet";

/**
 * X only lets an account reply to or quote posts that it wrote itself or
 * that mention it. Returns an error message, or `undefined` if allowed.
 * Plain retweets are always allowed.
 */
export function checkQuotePolicy(
  post: TweetLookup,
  kind: QuoteKind,
  account: string
): string | undefined {
  if (kind === "retweet") return;
  const handle = account.replace(/^@/, "").toLowerCase();
  const author = post.username.toLowerCase();
  const mentioned = post.mentions.some((m) => m.toLowerCase() === handle);
  if (author === handle || mentioned) return;
  const verb = kind === "reply" ? "reply to" : "quote";
  return (
    `X only allows @${handle} to ${verb} posts written by @${handle} or that mention @${handle}. ` +
    `This post is by @${post.username}. ` +
    (kind === "quote"
      ? "Remove the tweet text to make this a plain retweet, or write a standalone tweet with the link instead."
      : "Write a standalone tweet with the link instead.")
  );
}
