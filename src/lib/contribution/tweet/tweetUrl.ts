// Lenient parsing of X / Twitter post references, mirroring the
// twitter-together action so that whatever the form accepts will publish.
//   https://x.com/user/status/123
//   https://twitter.com/user/status/123?s=20&t=abc
//   https://mobile.twitter.com/user/status/123#m
//   https://x.com/user/status/123/photo/1
//   https://x.com/i/web/status/123

const TWEET_URL_REGEX =
  /^(?:https?:\/\/)?(?:(?:www|mobile)\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,15})(?:\/web)?\/status(?:es)?\/(\d+)(?:\/[^?#]*)?\/?(?:[?#].*)?$/i;

export type TweetRef = {
  id: string;
  username: string | null;
  url: string;
};

export const TWEET_URL_FORMAT = "https://x.com/[user]/status/[id]";

export function canonicalTweetUrl(username: string | null, id: string) {
  return `https://x.com/${username || "i/web"}/status/${id}`;
}

export function parseTweetRef(input?: string | null): TweetRef | null {
  const ref = (input || "").trim();
  const match = ref.match(TWEET_URL_REGEX);
  if (!match) {
    return null;
  }
  const [, username, id] = match;
  // https://x.com/i/web/status/123 does not carry the author
  const author = username.toLowerCase() === "i" ? null : username;
  return { id, username: author, url: canonicalTweetUrl(author, id) };
}

// used as the text field transform: rewrites twitter.com links to x.com and
// strips tracking parameters as the user types / pastes
export function normalizeTweetUrl(input: string) {
  const parsed = parseTweetRef(input);
  return parsed ? parsed.url : input.trim();
}

// official embed, works inside an iframe without widgets.js
export function tweetEmbedUrl(input: string) {
  const parsed = parseTweetRef(input);
  if (!parsed) return "";
  return `https://platform.twitter.com/embed/Tweet.html?id=${parsed.id}&dnt=true`;
}
