import { expect } from "@playwright/test";
import formTest from "@/../test/fixtures/form.fixture";
import {
  describeScheduleForPr,
  wallToUtc,
} from "@/lib/contribution/tweet/tweetSchedule";

const test = formTest({ repo: "_E2E_tweets", contribution: "tweet" });

test("tweet submits basic", async ({ f }) => {
  await f.cannotSubmit(["Required unless retweeting or uploading images"]);

  await f.setText("Tweet Text", "My Test Tweet\n\nWith a newline");

  expect(await f.submit()).toMatchObject({
    req: {
      contribution: "tweet",
      text: "My Test Tweet\n\nWith a newline",
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-tweet-my-test-tweet-with-a-newline",
        changes: [
          {
            files: {
              "tweets/timestamp-add-tweet-my-test-tweet-with-a-newline.tweet":
                "My Test Tweet\n\nWith a newline",
            },
            message: "Add tweet my test tweet with a newline",
          },
        ],
      },
      pr: {
        body: `This Pull Request creates a new tweet.${f.FOOTER}`,
        head: "c11r/timestamp-add-tweet-my-test-tweet-with-a-newline",
        title: "Add tweet my test tweet with a newline",
      },
    },
  });
});

test("tweet retweet", async ({ f }) => {
  await f.clickButton("Quote Type", "Retweet");

  await f.cannotSubmit(["Required retweet URL"]);

  await f.setText("Retweet URL", "https://twitter.com/test/status/123");

  expect(await f.submit()).toMatchObject({
    req: {
      quoteType: "retweet",
      quoteUrl: "https://x.com/test/status/123",
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-retweet-test",
        changes: [
          {
            files: {
              "tweets/timestamp-add-retweet-test.tweet": `---
retweet: https://x.com/test/status/123
---`,
            },
            message: "Add retweet test",
          },
        ],
      },
      pr: {
        body: `This Pull Request creates a new retweet of https://x.com/test/status/123.

There is no text in the tweet.${f.FOOTER}`,
        head: "c11r/timestamp-add-retweet-test",
        title: "Add retweet test",
      },
    },
  });
});

// TODO test overrides, tags...

test("tweet reply", async ({ f }) => {
  await f.clickButton("Quote Type", "Reply");

  await f.cannotSubmit([
    "Required reply URL",
    "Required unless retweeting or uploading images",
  ]);

  await f.setText("Reply URL", "https://twitter.com/test/status/456");

  await f.cannotSubmit(["Required unless retweeting or uploading images"]);

  await f.setText("Tweet Text", "Tweet Reply Here");

  expect(await f.submit()).toMatchObject({
    req: {
      quoteType: "reply",
      quoteUrl: "https://x.com/test/status/456",
      text: "Tweet Reply Here",
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-reply-test-tweet-reply-here",
        changes: [
          {
            files: {
              "tweets/timestamp-add-reply-test-tweet-reply-here.tweet": `---
reply: https://x.com/test/status/456
---

Tweet Reply Here`,
            },
            message: "Add reply test tweet reply here",
          },
        ],
      },
      pr: {
        body: `This Pull Request creates a new reply to https://x.com/test/status/456.${f.FOOTER}`,
        head: "c11r/timestamp-add-reply-test-tweet-reply-here",
        title: "Add reply test tweet reply here",
      },
    },
  });
});

test("tweet image", async ({ f }) => {
  await f.cannotSubmit(["Required unless retweeting or uploading images"]);

  await f.uploadAndCrop("Upload Images (4 remaining)", "kitten.jpg");

  expect(await f.submit()).toMatchObject({
    req: {
      media: [
        {
          data: "data:image/jpeg;base64,/9j/4A...",
          type: "jpeg",
        },
      ],
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-tweet-with-media",
        changes: [
          {
            files: {
              "media/timestamp-add-tweet-with-media.jpeg":
                "[converted:jpeg:/9j/4A]",
              "tweets/timestamp-add-tweet-with-media.tweet": `---
media:
  - file: timestamp-add-tweet-with-media.jpeg
---`,
            },
            message: "Add tweet with media",
          },
        ],
      },
      pr: {
        body: `This Pull Request creates a new tweet with 1 image.

There is no text in the tweet.${f.FOOTER}`,
        head: "c11r/timestamp-add-tweet-with-media",
        title: "Add tweet with media",
      },
    },
  });
});

test("tweet reply with images and alts", async ({ f }) => {
  await f.cannotSubmit(["Required unless retweeting or uploading images"]);

  await f.clickButton("Quote Type", "Reply");

  await f.cannotSubmit([
    "Required reply URL",
    "Required unless retweeting or uploading images",
  ]);

  await f.setText("Reply URL", "https://twitter.com/test/status/456");

  await f.cannotSubmit(["Required unless retweeting or uploading images"]);

  await f.setText("Tweet Text", "Tweet Reply Here");

  await f.uploadAndCrop(
    "Upload Images (4 remaining)",
    "kitten.jpg",
    "My Kitten"
  );
  await f.uploadAndCrop("Upload Images (3 remaining)", "dice.png", "Some Dice");
  await f.uploadAndCrop("Upload Images (2 remaining)", "kitten.jpg");
  await f.uploadAndCrop("Upload Images (1 remaining)", "dice.png");

  expect(await f.submit()).toMatchObject({
    req: {
      contribution: "tweet",
      media: [
        {
          alt: "My Kitten",
          data: "data:image/jpeg;base64,/9j/4A...",
          type: "jpeg",
        },
        {
          alt: "Some Dice",
          data: "data:image/png;base64,iVBORw...",
          type: "png",
        },
        {
          data: "data:image/jpeg;base64,/9j/4A...",
          type: "jpeg",
        },
        {
          data: "data:image/png;base64,iVBORw...",
          type: "png",
        },
      ],
      quoteType: "reply",
      quoteUrl: "https://x.com/test/status/456",
      text: "Tweet Reply Here",
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-reply-test-with-media-tweet-reply-here",
        changes: [
          {
            files: {
              "media/timestamp-add-reply-test-with-media-tweet-reply-here-2.jpeg":
                "[converted:jpeg:/9j/4A]",
              "media/timestamp-add-reply-test-with-media-tweet-reply-here-3.png":
                "[converted:png:iVBORw]",
              "media/timestamp-add-reply-test-with-media-tweet-reply-here-my.jpeg":
                "[converted:jpeg:/9j/4A]",
              "media/timestamp-add-reply-test-with-media-tweet-reply-here-some-1.png":
                "[converted:png:iVBORw]",
              "tweets/timestamp-add-reply-test-with-media-tweet-reply-here.tweet": `---
reply: https://x.com/test/status/456
media:
  - file: timestamp-add-reply-test-with-media-tweet-reply-here-my.jpeg
    alt: My Kitten
  - file: timestamp-add-reply-test-with-media-tweet-reply-here-some-1.png
    alt: Some Dice
  - file: timestamp-add-reply-test-with-media-tweet-reply-here-2.jpeg
  - file: timestamp-add-reply-test-with-media-tweet-reply-here-3.png
---

Tweet Reply Here`,
            },
            message: "Add reply test with media tweet reply here",
          },
        ],
      },
      pr: {
        body: `This Pull Request creates a new reply to https://x.com/test/status/456 with 4 images.${f.FOOTER}`,
        head: "c11r/timestamp-add-reply-test-with-media-tweet-reply-here",
        title: "Add reply test with media tweet reply here",
      },
    },
  });
});

const retweetText = formTest({
  repo: "_E2E_tweets",
  contribution: "tweetTextRequired",
});

retweetText("retweet with tweetTextRequired", async ({ f }) => {
  await f.cannotSubmit(["Required unless uploading images"]);
  await f.clickButton("Quote Type", "Retweet");
  await f.cannotSubmit([
    "Required retweet URL",
    "Required unless uploading images",
  ]);
  await f.setText("Retweet URL", "https://twitter.com/test/status/456");
  await f.cannotSubmit(["Required unless uploading images"]);
  await f.setText("Tweet Text", "Requried Retweet Text Here");
  expect(await f.submit()).toMatchObject({
    req: {
      quoteType: "retweet",
      quoteUrl: "https://x.com/test/status/456",
      text: "Requried Retweet Text Here",
    },
  });
});

retweetText("media with tweetTextRequired", async ({ f }) => {
  await f.cannotSubmit(["Required unless uploading images"]);
  await f.uploadAndCrop(
    "Upload Images (4 remaining)",
    "kitten.jpg",
    "My Kitten"
  );
  expect(await f.submit()).toMatchObject({
    req: {
      contribution: "tweetTextRequired",
    },
  });
});

const accountTest = formTest({
  repo: "_E2E_tweets",
  contribution: "tweetAccount",
});

accountTest("normalizes pasted links", async ({ f }) => {
  await f.clickButton("Quote Type", "Retweet");
  await f.setText(
    "Retweet URL",
    "https://mobile.twitter.com/test/status/123?s=20&t=abc#m"
  );
  expect(await f.getValue("Retweet URL")).toBe("https://x.com/test/status/123");
  await f.hasText(
    "iframe: https://platform.twitter.com/embed/Tweet.html?id=123&dnt=true"
  );
  expect(await f.submit()).toMatchObject({
    req: { quoteType: "retweet", quoteUrl: "https://x.com/test/status/123" },
    res: {
      commit: {
        changes: [
          {
            files: {
              "tweets/timestamp-add-retweet-test.tweet": `---
retweet: https://x.com/test/status/123
---`,
            },
          },
        ],
      },
      pr: {
        body: `This Pull Request creates a new retweet of https://x.com/test/status/123.

There is no text in the tweet.${f.FOOTER}`,
      },
    },
  });
});

accountTest("rejects malformed links", async ({ f }) => {
  await f.clickButton("Quote Type", "Retweet");
  await f.setText("Retweet URL", "https://example.com/test/status/123");
  await f.cannotSubmit(["Must match format https://x.com/[user]/status/[id]"]);
  await f.setText("Retweet URL", "https://x.com/test/status/abc");
  await f.cannotSubmit(["Must match format https://x.com/[user]/status/[id]"]);
});

const THIRD_PARTY_QUOTE =
  "X only allows @eth_classic to quote posts written by @eth_classic or that mention @eth_classic. This post is by @test. Remove the tweet text to make this a plain retweet, or write a standalone tweet with the link instead.";
const THIRD_PARTY_REPLY =
  "X only allows @eth_classic to reply to posts written by @eth_classic or that mention @eth_classic. This post is by @test. Write a standalone tweet with the link instead.";

accountTest("blocks quoting third party posts", async ({ f }) => {
  await f.clickButton("Quote Type", "Retweet");
  await f.setText("Retweet URL", "https://x.com/test/status/123");
  await f.setText("Tweet Text", "Look at this");
  await f.cannotSubmit([THIRD_PARTY_QUOTE]);
  // removing the text makes it a plain retweet, which is allowed
  await f.setText("Tweet Text", "");
  await f.hasNoText(THIRD_PARTY_QUOTE);
  expect(await f.submit()).toMatchObject({
    req: { quoteType: "retweet", quoteUrl: "https://x.com/test/status/123" },
  });
});

accountTest("allows quoting own posts, enables auto-merge", async ({ f }) => {
  await f.clickButton("Quote Type", "Retweet");
  await f.setText("Retweet URL", "https://x.com/eth_classic/status/1001");
  await f.setText("Tweet Text", "Look at this");
  expect(await f.submit()).toMatchObject({
    req: {
      quoteType: "retweet",
      quoteUrl: "https://x.com/eth_classic/status/1001",
      text: "Look at this",
    },
    res: {
      autoMerge: { pullRequestId: "PR_node_123", mergeMethod: "MERGE" },
    },
  });
});

test("does not enable auto-merge unless configured", async ({ f }) => {
  await f.setText("Tweet Text", "Plain");
  const { res } = await f.submit();
  expect(res.autoMerge).toBeUndefined();
});

accountTest("allows quoting posts that mention the account", async ({ f }) => {
  await f.clickButton("Quote Type", "Retweet");
  await f.setText("Retweet URL", "https://x.com/someone/status/1002");
  await f.setText("Tweet Text", "Thanks for the mention");
  expect(await f.submit()).toMatchObject({
    req: { quoteUrl: "https://x.com/someone/status/1002" },
  });
});

accountTest("blocks replying to third party posts", async ({ f }) => {
  await f.clickButton("Quote Type", "Reply");
  await f.setText("Reply URL", "https://x.com/test/status/123");
  await f.setText("Tweet Text", "Replying");
  await f.cannotSubmit([THIRD_PARTY_REPLY]);
  await f.setText("Reply URL", "https://x.com/eth_classic/status/1001");
  await f.hasNoText(THIRD_PARTY_REPLY);
  expect(await f.submit()).toMatchObject({
    req: {
      quoteType: "reply",
      quoteUrl: "https://x.com/eth_classic/status/1001",
      text: "Replying",
    },
  });
});

accountTest("blocks posts that do not exist", async ({ f }) => {
  await f.clickButton("Quote Type", "Retweet");
  await f.setText("Retweet URL", "https://x.com/test/status/404");
  await f.cannotSubmit([
    "Post not found. It may have been deleted, or the account may be protected.",
  ]);
});

accountTest("schedules a tweet", async ({ f }) => {
  // a week from now, on the half hour, in UTC
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setUTCMinutes(30, 0, 0);
  const iso = date.toISOString(); // YYYY-MM-DDTHH:30:00.000Z
  const input = iso.slice(0, 16); // YYYY-MM-DDTHH:30

  await f.setText("Tweet Text", "Future news");
  await f.selectOption("Schedule", "UTC");
  // the native picker refuses the past: min is at least 30 minutes ahead
  const picker = f.getByLabel("Schedule").locator("input");
  const min = (await picker.getAttribute("min")) as string;
  expect(new Date(`${min}Z`).getTime()).toBeGreaterThan(
    Date.now() + 29 * 60000
  );
  expect(((await picker.getAttribute("max")) as string) > min).toBe(true);
  await f.setInputValue("Schedule", "2020-01-02T03:04");
  await f.cannotSubmit(["Must be at least 30 minutes in the future"]);
  await f.setInputValue("Schedule", "2099-01-02T03:00");
  await f.cannotSubmit(["Must be within 365 days"]);
  // off the 30-minute grid
  await f.setInputValue("Schedule", input.slice(0, 14) + "15");
  await f.cannotSubmit(["Must be on the hour or half hour"]);
  await f.hasTextContaining("Checks run every 30 minutes");
  await f.setInputValue("Schedule", input);
  await f.hasTextContaining(`🌐 ${input.slice(11, 16)} UTC`);
  expect(await f.submit()).toMatchObject({
    req: { text: "Future news", schedule: input },
    res: {
      commit: {
        changes: [
          {
            files: {
              "tweets/timestamp-add-tweet-future-news.tweet": `---
schedule: ${iso}
---

Future news`,
            },
          },
        ],
      },
      pr: {
        body: `This Pull Request creates a new tweet.

${describeScheduleForPr(iso)}${f.FOOTER}`,
      },
    },
  });
});

test("formats the schedule for humans", async () => {
  expect(describeScheduleForPr("2026-09-21T07:00:00.000Z")).toBe(
    `📅 Scheduled for Monday, 21 September 2026

🌐 07:00 UTC
🇺🇸 03:00 Eastern
🇨🇳 15:00 China Standard Time

Merging this Pull Request queues the tweet. It publishes automatically at that time, not on merge.`
  );
  // a zone on a different calendar day says so
  expect(describeScheduleForPr("2026-12-21T02:30:00.000Z")).toContain(
    "🇺🇸 21:30 Eastern (Sun 20 Dec)"
  );
  expect(describeScheduleForPr("2026-12-21T02:30:00.000Z")).toContain(
    "🇨🇳 10:30 China Standard Time\n"
  );
});

accountTest("converts the picked time zone to UTC", async ({ f }) => {
  // a week from now, on the hour, typed as a US Eastern wall time
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  date.setUTCMinutes(0, 0, 0);
  const wall = date.toISOString().slice(0, 16);
  const expected = wallToUtc(wall, "America/New_York");
  expect(expected).not.toBe(wall); // Eastern is never UTC

  await f.setText("Tweet Text", "Timezones");
  await f.selectOption("Schedule", "America/New_York");
  await f.setInputValue("Schedule", wall);
  await f.hasTextContaining(`🇺🇸 ${wall.slice(11, 16)} US Eastern`);
  await f.hasTextContaining(`🌐 ${expected.slice(11, 16)} UTC`);
  expect(await f.submit()).toMatchObject({ req: { schedule: expected } });
});

test("converts wall times between zones", async () => {
  // September: New York is UTC-4
  expect(wallToUtc("2026-09-21T03:00", "America/New_York")).toBe(
    "2026-09-21T07:00"
  );
  // December: New York is UTC-5
  expect(wallToUtc("2026-12-21T03:00", "America/New_York")).toBe(
    "2026-12-21T08:00"
  );
  expect(wallToUtc("2026-09-21T15:00", "Asia/Shanghai")).toBe(
    "2026-09-21T07:00"
  );
  expect(wallToUtc("2026-09-21T07:00", "UTC")).toBe("2026-09-21T07:00");
  expect(wallToUtc("garbage", "UTC")).toBe("");
});
