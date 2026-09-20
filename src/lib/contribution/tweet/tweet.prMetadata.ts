import slugify from "@/lib/helpers/slugify";

import type { Image, PrMetadata } from "@/types";
import { normalizeTweetUrl, parseTweetRef } from "./tweetUrl";
import { scheduleToIso } from "./tweetSchedule";

const tweetPrMetadata: PrMetadata = ({
  data,
}: {
  data: {
    media?: Image[];
    quoteType?: string;
    quoteUrl?: string;
    text?: string;
    schedule?: string;
  };
}) => {
  // todo poll, etc.
  const mediaCount = data.media?.length;

  let title = data.quoteType || "tweet";

  if (data.quoteType && data.quoteUrl) {
    const ref = parseTweetRef(data.quoteUrl);
    title += " " + (ref?.username || ref?.id || data.quoteUrl.split("/")[3]);
  }

  if (mediaCount) {
    title += " with media";
  }

  if (data.text) {
    title += " " + data.text;
  }

  title = "Add " + slugify(title, { join: " " });

  let message = "This Pull Request creates a new";

  if (data.quoteType && data.quoteUrl) {
    message += ` ${data.quoteType} ${
      data.quoteType === "retweet" ? "of" : "to"
    } ${normalizeTweetUrl(data.quoteUrl)}`;
  } else {
    message += " tweet";
  }

  if (mediaCount) {
    message += ` with ${mediaCount} image${mediaCount > 1 ? "s" : ""}`;
  }

  message += ".";

  if (!data.text) {
    message += `\n\nThere is no text in the tweet.`;
  }

  const schedule = scheduleToIso(data.schedule);
  if (schedule) {
    // the `schedule` front matter is what actually delays publishing; merging
    // this pull request does not publish a scheduled tweet
    message += `\n\nScheduled to be published at ${schedule}. Merging this Pull Request will not publish it immediately.`;
  }

  return { title, message };
};

export default tweetPrMetadata;
