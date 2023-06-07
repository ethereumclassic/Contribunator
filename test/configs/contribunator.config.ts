import tweetConfig, { tweetSuggestions } from "@/contributions/tweet/config";
import { AppConfig } from "@/lib/config";

// TODO sort this out into different files

import kitchenSinkGenericConfig from "./kitchenSink.config";
import genericTweetConfig from "./tweet.config";
import genericConfig from "@/contributions/generic/config";
import linkConfig from "./etc/link.config";
import appConfig from "./etc/app.config";
import newsConfig from "./etc/news.config";

export const E2E: AppConfig = {
  authorization: ["github", "anon"],
  title: "TEST TITLE",
  description: "TEST DESCRIPTION",
  owner: "test-owner",
  base: "test-base",
  branchPrefix: "test-branch-prefix/",
  repos: {
    TEST: {
      title: "TEST REPO TITLE",
      description: "TEST REPO DESCRIPTION",
      contributions: {
        api: genericConfig({
          options: {
            commit: async ({ body }) => ({ files: { "test.md": body.text } }),
            fields: {
              text: {
                type: "text",
                title: "Text",
              },
            },
          },
        }),
        testing: kitchenSinkGenericConfig,
        tweet: tweetConfig({
          title: "TEST CONTRIBUTION TITLE",
          description: "TEST CONTRIBUTION DESCRIPTION",
        }),
      },
    },
  },
};

export const DEV: AppConfig = {
  title: "DEV C11R",
  repos: {
    Another: {
      title: "Testing",
      description: "Test Description",
      contributions: {
        // genericTweet: genericTweetConfig,
        // collection: collectionConfig,
        link: linkConfig,
        app: appConfig,
        news: newsConfig,
        // testing: kitchenSinkGenericConfig,
        // tweet: tweetConfig({
        //   options: {
        //     text: {
        //       placeholder: "e.g. This is my development tweet",
        //       tags: ["#Contribunator"],
        //       suggestions: [
        //         ...tweetSuggestions(),
        //         {
        //           hasNo: "Contribunator",
        //           message: "Include the word Contribunator in your tweet!",
        //         },
        //       ],
        //     },
        //   },
        // }),
      },
    },
  },
};

export const DEMO: AppConfig = {
  repos: {
    Sample: {
      title: "Sample Repo",
      description: "A useless and vandalized demo repository for Contribunator",
      contributions: {
        // cool: genericConfig({
        //   title: "Generic Contribution",
        //   description: "A generic contribution",
        // }),
        tweet: tweetConfig(),
      },
    },
  },
};

let exported: null | AppConfig = null;

if (process.env.NEXT_PUBLIC_TESTING === "E2E") {
  exported = E2E;
}

if (process.env.NEXT_PUBLIC_TESTING === "DEMO") {
  exported = DEMO;
}

if (process.env.NEXT_PUBLIC_TESTING === "DEV") {
  exported = DEV;
}

export default exported;
