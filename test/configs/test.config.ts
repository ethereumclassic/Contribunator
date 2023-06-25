import type { ContributionOptions, UserConfig } from "@/types";

import contribution from "@/lib/contribution";
import tweet from "@/lib/contribution/tweet";
import news from "@/lib/contribution/etc/news";
import link from "@/lib/contribution/etc/link";
import app from "@/lib/contribution/etc/app";
import video from "@/lib/contribution/etc/video";

import fieldTests, { combined } from "./fields";

const testContribution: ContributionOptions = {
  commit: async ({ body }: { body: { text: string } }) => ({
    files: { "test.md": body.text },
  }),
  form: {
    fields: {
      text: {
        type: "text",
        title: "Text",
        validation: { required: true },
      },
    },
  },
};
const test = contribution(testContribution);

const testConfig: UserConfig = {
  authorization: ["github", "anon", "api"],
  title: "E2E C11R",
  description:
    "This is a test mode for end-to-end testing, using a Mock Github API",
  owner: "test-owner",
  repos: {
    TEST: {
      title: "TEST REPO TITLE",
      description: "TEST REPO DESCRIPTION",
      contributions: {
        api: contribution({ ...testContribution, hidden: true }),
        combined,
        tweet: tweet({
          description: "Here's my custom description",
        }),
        app: app({
          description: "My App Description",
          relativeImagePath: "./images",
          absoluteImagePath: "content/services/apps/images",
          collectionPath: "test/etc/apps.yaml",
        }),
        video: video({
          collectionPath: "test/etc/videos.yaml",
        }),
        news: news({
          collectionPath: "test/etc/news.yaml",
        }),
        link: link({
          keyMap: {
            name: "__name",
            link: "__link",
            icon: "__icon",
          },
          categories: {
            wallets: {
              title: "Wallet",
              sourcePath: "test/etc/wallets.yaml",
              web: {
                title: "Web Wallet",
                sourceKey: "web",
              },
              browser: {
                title: "Browser Integrated Wallet",
                sourceKey: "browsers",
              },
            },
            social: {
              showIcons: true,
              title: "Social Channels",
              sourcePath: "test/etc/channels.yaml",
              chatRooms: {
                title: "General Chat Room",
                sourceKey: "Chat Rooms",
              },
              developmentChat: {
                title: "Development Chat Room",
                sourceKey: "Development Chat",
              },
              telegramGroups: {
                title: "Telegram Group",
                sourceKey: "Telegram Groups",
              },
            },
            dev: {
              title: "Mining & Development",
              priceSource: {
                title: "Price Source",
                sourcePath: "test/etc/tooling.yaml",
                sourceKey: "prices",
              },
              repo: {
                showDescription: true,
                title: "Git Repository",
                sourcePath: "test/etc/tooling.yaml",
                sourceKey: "repos",
              },
            },
          },
        }),
      },
    },
    fields: {
      title: "Field Tests",
      contributions: fieldTests,
    },
    overrides: {
      title: "Title Override",
      description: "Description Override",
      owner: "owner-override",
      branchPrefix: "prefix-override/",
      base: "base-override",
      contributions: {
        test: contribution({
          ...testContribution,
          title: "Override Contribution Title",
          description: "Override Contribution Description",
        }),
      },
    },
    github: {
      authorization: ["github"],
      title: "Github Only",
      contributions: {
        test,
      },
    },
    api: {
      authorization: ["api"],
      title: "API Only",
      contributions: {
        test,
      },
    },
    anon: {
      authorization: ["anon"],
      title: "Anon Only",
      contributions: {
        test,
      },
    },
  },
};

export default testConfig;
