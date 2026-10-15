import { ContributionLoaded } from "@/types";

import { string } from "yup";
import twitterText, { ParseTweetOptions } from "twitter-text";

import suggestions from "./tweet.suggestions";
import prMetadata from "./tweet.prMetadata";
import commit from "./tweet.commit";
import { TweetConfigInput } from ".";
import {
  TWEET_URL_FORMAT,
  normalizeTweetUrl,
  parseTweetRef,
  tweetEmbedUrl,
} from "./tweetUrl";
import { checkReplyPolicy, lookupTweet } from "./tweetLookup";
import { scheduleToDate } from "./tweetSchedule";

const MIN_SCHEDULE_MINUTES = 30;
const MAX_SCHEDULE_DAYS = 365;
// scheduled tweets are published by a check that runs every 30 minutes
const SCHEDULE_STEP_MINUTES = 30;
// X Premium (verified) accounts can post up to 25,000 characters
const MAX_LENGTH = 280;
const PREMIUM_MAX_LENGTH = 25000;
// X's counting rules; @types/twitter-text leaves out the exported configs
const { configs } = twitterText as unknown as {
  configs: { defaults: ParseTweetOptions };
};

// as X counts it; a quote is published with the post link appended to the
// text (see twitter-together), so the link counts too
function tweetLength(text = "", quoteUrl?: string) {
  if (!text) return 0;
  return twitterText.parseTweet(quoteUrl ? `${text}\n\n${quoteUrl}` : text, {
    ...configs.defaults,
    // never invalid here, the caller compares with its limit
    maxWeightedTweetLength: Infinity,
  }).weightedLength;
}

const quoteOf = (data: { quoteType?: string; quoteUrl?: string }) =>
  (data.quoteType === "retweet" && data.quoteUrl) || undefined;

export default function tweetConfig({
  options = {},
}: TweetConfigInput = {}): ContributionLoaded {
  const {
    retweetTextRequired = false,
    account,
    premium = false,
    schedule = true,
    media: mediaOption = {},
    // TODO
    // retweet = true,
    // reply = true,
  } = options;

  // which media can be attached, and where it is stored
  const {
    images = "repo",
    video = false,
    remoteUrl = false,
    maxVideoMB,
  } = mediaOption || { images: false as const };

  const handle = account?.replace(/^@/, "");
  const maxLength = premium ? PREMIUM_MAX_LENGTH : MAX_LENGTH;

  // deep merge form and form options
  return {
    prMetadata,
    commit,
    form: {
      fields: {
        quoteType: {
          type: "choice",
          title: "Quote Type",
          as: "buttons",
          unset: "None",
          options: {
            retweet: {
              title: "Retweet",
            },
            reply: {
              title: "Reply",
            },
          },
        },
        quoteUrl: {
          type: "text",
          title: ({ decorated }) => `${decorated.quoteType?.markdown} URL`,
          placeholder: `e.g. ${TWEET_URL_FORMAT}`,
          transform: normalizeTweetUrl,
          // X may refuse replies to posts that don't mention the account; we
          // can't know for sure, so this doesn't block submission. Quotes are
          // published as a link in the text, which X always accepts.
          warning: handle
            ? async ({ value, data }) => {
                const ref = parseTweetRef(value);
                if (!ref || data.quoteType !== "reply") return;
                const post = await lookupTweet(ref.id);
                return post ? checkReplyPolicy(post, handle) : undefined;
              }
            : undefined,
          iframe: tweetEmbedUrl,
          hidden: ({ data }) => !data.quoteType,
          validation: {
            yup: string().when("quoteType", {
              is: (quoteType: string) => !!quoteType, // if quote type is set
              then: (schema) =>
                schema.test({
                  async test(text, ctx) {
                    if (!text) {
                      return ctx.createError({
                        message: `Required ${ctx.parent.quoteType} URL`,
                      });
                    }
                    const ref = parseTweetRef(text);
                    if (!ref) {
                      return ctx.createError({
                        message: `Must match format ${TWEET_URL_FORMAT}`,
                      });
                    }
                    // verify the post exists; the reply policy is only a
                    // warning, see `warning` above
                    if (!handle) {
                      return true;
                    }
                    let post;
                    try {
                      post = await lookupTweet(ref.id);
                    } catch (err) {
                      // the lookup is best effort, the pull request preview
                      // will check again
                      return true;
                    }
                    if (!post) {
                      return ctx.createError({
                        message:
                          "Post not found. It may have been deleted, or the account may be protected.",
                      });
                    }
                    return true;
                  },
                }),
            }),
          },
        },
        text: {
          type: "text",
          as: "textarea",
          title: "Tweet Text",
          placeholder: "Tweet Text Here",
          suggestions: suggestions(),
          counter: ({ value, data }) => ({
            count: tweetLength(value, quoteOf(data)),
            limit: MAX_LENGTH,
            max: premium ? PREMIUM_MAX_LENGTH : undefined,
          }),
          tags: ["👀", "😂", "✨", "🔥", "💪", "#twitter", "#memes", "#love"],
          validation: {
            yup: string()
              .test({
                test(text = "", ctx) {
                  if (text === "") {
                    return true;
                  }
                  if (text.includes("---")) {
                    return ctx.createError({
                      message: "Do not include `---`",
                    });
                  }
                  // twitter-together publishes a quote with the post link
                  // appended to the text, X shows it as the quote
                  const quote =
                    ctx.parent.quoteType === "retweet" && ctx.parent.quoteUrl;
                  if (quote && twitterText.extractUrls(text).length) {
                    return ctx.createError({
                      message: "Quote tweets cannot contain other links",
                    });
                  }
                  const length = tweetLength(text, quoteOf(ctx.parent));
                  if (length > maxLength) {
                    return ctx.createError({
                      message: `Tweet is too long (${length.toLocaleString(
                        "en-US"
                      )} of ${maxLength.toLocaleString("en-US")} characters)`,
                    });
                  }
                  return true;
                },
              })
              .when(["media", "video", "quoteType"], {
                is: (media: string[], video: unknown[], quoteType: string) => {
                  if (quoteType === "retweet" && retweetTextRequired) {
                    return true;
                  }
                  if (quoteType === "reply") {
                    return true;
                  }
                  if (!quoteType && !media && !video) {
                    return true;
                  }
                  return false;
                },
                then: (schema) =>
                  schema.required(
                    retweetTextRequired
                      ? "Required unless uploading images"
                      : "Required unless retweeting or uploading images"
                  ),
              }),
          },
        },
        ...(images && {
          media: {
            type: "images",
            title: "Upload Images",
            alt: true,
            storage: images,
            remoteUrl,
            // X allows up to 4 images, or 1 video
            hidden: ({ data }) => !!data.video,
          },
        }),
        ...(video && {
          video: {
            type: "media",
            title: "Upload Video",
            accept: ["video"],
            max: 1,
            alt: true,
            remoteUrl,
            maxSizeMB: maxVideoMB,
            hidden: ({ data }) => !!data.media?.length,
          },
        }),
        ...(schedule && {
          schedule: {
            type: "datetime",
            title: "Schedule",
            info: "Optional, publishes later",
            validation: {
              yup: string().test({
                test(value, ctx) {
                  if (!value) {
                    return true;
                  }
                  const date = scheduleToDate(value);
                  if (!date) {
                    return ctx.createError({ message: "Invalid date" });
                  }
                  const minutes = (date.getTime() - Date.now()) / 60000;
                  if (minutes < MIN_SCHEDULE_MINUTES) {
                    return ctx.createError({
                      message: `Must be at least ${MIN_SCHEDULE_MINUTES} minutes in the future`,
                    });
                  }
                  if (minutes > MAX_SCHEDULE_DAYS * 24 * 60) {
                    return ctx.createError({
                      message: `Must be within ${MAX_SCHEDULE_DAYS} days`,
                    });
                  }
                  if (date.getUTCMinutes() % SCHEDULE_STEP_MINUTES !== 0) {
                    return ctx.createError({
                      message: "Must be on the hour or half hour",
                    });
                  }
                  return true;
                },
              }),
            },
          },
        }),
      },
    },
  };
}
