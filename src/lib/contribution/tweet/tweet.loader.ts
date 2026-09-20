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
import { checkQuotePolicy, lookupTweet, QuoteKind } from "./tweetLookup";
import { scheduleToDate } from "./tweetSchedule";

const MIN_SCHEDULE_MINUTES = 30;
const MAX_SCHEDULE_DAYS = 365;

export default function tweetConfig({
  options = {},
}: TweetConfigInput = {}): ContributionLoaded {
  const {
    retweetTextRequired = false,
    account,
    schedule = true,
    // TODO
    // media = true,
    // retweet = true,
    // reply = true,
  } = options;

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
          info: handle
            ? `Quotes and replies only for @${handle} posts or mentions`
            : undefined,
          transform: normalizeTweetUrl,
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
                    // verify the post exists and that X will accept it
                    if (!handle) {
                      return true;
                    }
                    const kind: QuoteKind =
                      ctx.parent.quoteType === "reply"
                        ? "reply"
                        : ctx.parent.text
                        ? "quote"
                        : "retweet";
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
                    const message = checkQuotePolicy(post, kind, handle);
                    if (message) {
                      return ctx.createError({ message });
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
                  const tweet = twitterText.parseTweet(text);
                  if (!tweet.valid) {
                    return ctx.createError({
                      message: "Tweet is too long",
                    });
                  }
                  return true;
                },
              })
              .when(["media", "quoteType"], {
                is: (media: string[], quoteType: string) => {
                  if (quoteType === "retweet" && retweetTextRequired) {
                    return true;
                  }
                  if (quoteType === "reply") {
                    return true;
                  }
                  if (!quoteType && !media) {
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
        media: {
          type: "images",
          title: "Upload Images",
          alt: true,
        },
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
