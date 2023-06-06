import { test as base } from "@playwright/test";
import { TweetFixture } from "@/../test/fixtures/tweet.fixture";

const test = base.extend<{ t: TweetFixture }>({
  t: async ({ page, baseURL, headless }, use) => {
    const t = new TweetFixture({
      page,
      headless,
      baseURL,
      repo: "TEST",
      contribution: "tweet",
    });
    await t.goto();
    await use(t);
  },
});

const TWEET_TEXT = "This is my test tweet!";
const QUOTE_URL = "https://twitter.com/TEST/status/1234567890";
const TEXT_VALIDATION = "Required unless retweeting or uploading images";
const RETWEET_VALIDATION = "Required retweet URL";
const REPLY_VALIDATION = "Required reply URL";
const IFRAME_TEXT = `iFrame for preview of ${QUOTE_URL}`;
const JPEG_NAME = "kitten.jpg";
const JPEG_ALT = "A cute kitten";
const JPEG_BASE64 = "data:image/jpeg;base64";
const PNG_NAME = "dice.png";
const PNG_ALT = "Translucent dice";
const PNG_BASE64 = "data:image/png;base64";

test("tweet text", async ({ t }) => {
  // await t.screenshot("required-text");
  await t.cannotSubmit([TEXT_VALIDATION]);
  await t.setText(TWEET_TEXT);
  await t.submit({ text: TWEET_TEXT });
  // await t.screenshot("submitted");
});
