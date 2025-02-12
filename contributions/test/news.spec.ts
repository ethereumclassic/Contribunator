import { expect } from "@playwright/test";
import formTest from "@/../test/fixtures/form.fixture";

const test = formTest({
  repo: "ethereumclassic.github.io",
  contribution: "news",
  footer:
    "\n\n---\n*Created using the [ETC Contribunator Bot](https://github.com/ethereumclassic/Contribunator)*",
});

test("news submits basic", async ({ f }) => {
  await f.cannotSubmit([
    "Article Title is a required field",
    "Article URL is a required field",
    "Tags is a required field",
  ]);

  await f.setText("Article Title", "My Test Article");
  await f.setText("Article URL", "https://example.com");

  await f.clickButton("Tags", "Development");

  // return;
  expect(await f.submit()).toEqual({
    req: {
      authorization: "anon",
      contribution: "news",
      link: "https://example.com",
      repo: "ethereumclassic.github.io",
      tags: ["development"],
      title: "My Test Article",
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-news-article-my-test-article",
        changes: [
          {
            files: {
              "content/news/links.collection.en.yaml": `- date: TIMESTAMP
  title: My Test Article
  link: https://example.com
  tags:
    - development
- date: 2023-02-01
  link: https://example.com/
  title: Test news item
  tags:
    - announcement
- date: 2022-09-08
  link: https://test.com/
  author: Autho Test
  source: Source Test
  title: This is some weird title.
  tags:
    - food
    - information
`,
            },
            message: "Add News Article: My Test Article",
          },
        ],
        createBranch: true,
        owner: "ethereumclassic",
        repo: "ethereumclassic.github.io",
        base: "main",
      },
      pr: {
        base: "main",
        body: `This PR adds a new News Article:

## Article Title
My Test Article

## Article URL
https://example.com

## Tags
Development${f.FOOTER}`,
        head: "c11r/timestamp-add-news-article-my-test-article",
        owner: "ethereumclassic",
        repo: "ethereumclassic.github.io",
        title: "Add News Article: My Test Article",
      },
    },
  });
});

test("news submits full", async ({ f }) => {
  await f.cannotSubmit([
    "Article Title is a required field",
    "Article URL is a required field",
    "Tags is a required field",
  ]);

  await f.setText("Article Title", "My Test Article");
  await f.setText("Article URL", "https://example.com");
  await f.setText("Author Name", "Bobby Tables");
  await f.setText("Source Name", "New York Times");

  await f.setText("Published Date", "2021-01-23");

  await f.clickButton("Tags", "Development");
  await f.clickButton("Tags", "Teams");
  await f.clickButton("Tags", "Series");

  await f.clickButton("Language", "中文");

  // return;
  expect(await f.submit()).toEqual({
    req: {
      locale: "zh",
      author: "Bobby Tables",
      authorization: "anon",
      contribution: "news",
      date: "2021-01-23",
      link: "https://example.com",
      repo: "ethereumclassic.github.io",
      source: "New York Times",
      tags: ["development", "teams", "series"],
      title: "My Test Article",
    },
    res: {
      commit: {
        branch: "c11r/timestamp-add-news-article-my-test-article",
        changes: [
          {
            files: {
              "content/news/links.collection.zh.yaml": `- date: 2021-01-23
  title: My Test Article
  link: https://example.com
  author: Bobby Tables
  source: New York Times
  tags:
    - development
    - teams
    - series
`,
            },
            message: "Add News Article: My Test Article",
          },
        ],
        createBranch: true,
        owner: "ethereumclassic",
        repo: "ethereumclassic.github.io",
        base: "main",
      },
      pr: {
        base: "main",
        body: `This PR adds a new News Article:

## Article Title
My Test Article

## Article URL
https://example.com

## Author Name
Bobby Tables

## Source Name
New York Times

## Published Date
2021-01-23

## Tags
Development, Teams, Series

## Language
中文${f.FOOTER}`,
        head: "c11r/timestamp-add-news-article-my-test-article",
        owner: "ethereumclassic",
        repo: "ethereumclassic.github.io",
        title: "Add News Article: My Test Article",
      },
    },
  });
});
