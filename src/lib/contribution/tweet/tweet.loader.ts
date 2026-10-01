import { ContributionLoaded } from "@/types";

import { string } from "yup";
import twitterText from "twitter-text";

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

export default function tweetConfig({
  options = {},
}: TweetConfigInput = {}): ContributionLoaded {
  const {
    retweetTextRequired = false,
    account,
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
                  const tweet = twitterText.parseTweet(
                    quote ? `${text}\n\n${ctx.parent.quoteUrl}` : text
                  );
                  if (!tweet.valid) {
                    return ctx.createError({
                      message: "Tweet is too long",
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
