import tweetConfig from "@/contributions/tweet/config";
import { AppConfig } from "@/lib/config";

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
        tweet: {
          title: "TEST CONTRIBUTION TITLE",
          description: "TEST CONTRIBUTION DESCRIPTION",
          type: "tweet",
          color: "blue",
        },
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
        tweet: {
          title: "Tweet",
          color: "blue",
          description: "Tweet about this project",
          type: "tweet",
          options: {
            text: {
              placeholder: "e.g. This is my development tweet",
              tags: ["#Contribunator"],
              suggestions: [
                {
                  hasNo: "Contribunator",
                  message: "Include the word Contribunator in your tweet!",
                },
              ],
            },
          },
        },
        "super-tweet": tweetConfig({ title: "SUPER TWEET! " }),
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
        cool: {
          title: "Generic Contribution",
          description: "A generic contribution",
          type: "generic",
        },
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
