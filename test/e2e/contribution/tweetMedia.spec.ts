import fs from "fs";
import os from "os";
import path from "path";
import { expect, test as base } from "@playwright/test";

import formTest from "@/../test/fixtures/form.fixture";

// Uploads to the (mocked) Vercel Blob store, links to remote files, resuming
// after a reload, and the cleanup cron. The mock's state is shared, so this
// file runs in order.
base.describe.configure({ mode: "serial" });

const test = formTest({ repo: "_E2E_tweets", contribution: "tweetMedia" });
const videoTest = formTest({ repo: "_E2E_tweets", contribution: "tweetVideo" });

const BLOB = "http://localhost:3000/api/e2e/blob";
const FILES = `${BLOB}/files/`;
const MB = 1024 * 1024;

async function control(request: any, body?: object) {
  const res = body
    ? await request.post(`${BLOB}/control`, { data: body })
    : await request.get(`${BLOB}/control`);
  return res.json();
}

// a file on disk, so that its modification time stays the same when it is
// chosen again (that's how an upload is recognised for resuming)
function videoFile(name: string, size: number) {
  const dir = path.join(os.tmpdir(), "c11r-e2e");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name);
  if (!fs.existsSync(file) || fs.statSync(file).size !== size) {
    const buffer = Buffer.alloc(size);
    for (let i = 0; i < size; i += 4096) buffer[i] = i % 251;
    fs.writeFileSync(file, buffer);
  }
  return file;
}

// Playwright gives files picked with setInputFiles the current time as
// lastModified; browsers use the file's modification time, which is what
// recognises a file chosen again. Build the file in the page instead.
async function chooseFile(
  page: any,
  label: string,
  {
    name,
    size,
    lastModified,
  }: { name: string; size: number; lastModified: number }
) {
  await page.getByLabel(label, { exact: true }).evaluate(
    (input: HTMLInputElement, { name, size, lastModified }: any) => {
      const file = new File([new Uint8Array(size)], name, {
        type: "video/mp4",
        lastModified,
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { name, size, lastModified }
  );
}

base.beforeAll(async ({ request }) => {
  await control(request, { reset: true });
});

test("uploads a video and commits its url", async ({ f, page }) => {
  await f.setText("Tweet Text", "Watch this");
  await page
    .getByLabel("Upload Video", { exact: true })
    .setInputFiles(videoFile("clip.mp4", 2 * MB));
  const item = page.locator("[data-media-item=video]");
  await expect(item.locator("video")).toBeVisible();
  await expect(item).toContainText("Uploaded: clip.mp4 · 2 MB");
  await item.locator("input").fill("A short clip");
  // X takes up to 4 images or 1 video: no images next to a video
  await expect(page.getByText("Upload Images")).toHaveCount(0);

  const { req, res } = await f.submit();
  const url: string = req.video[0].url;
  expect(url).toMatch(
    new RegExp(`^${FILES}uploads/[\\w-]+/[a-z0-9]+/clip\\.mp4$`)
  );
  expect(req.video[0]).toMatchObject({
    source: "upload",
    kind: "video",
    contentType: "video/mp4",
    size: 2 * MB,
    alt: "A short clip",
  });
  const files = res.commit.changes[0].files;
  expect(Object.keys(files)).toEqual([
    "tweets/timestamp-add-tweet-with-media-watch-this.tweet",
  ]);
  expect(files["tweets/timestamp-add-tweet-with-media-watch-this.tweet"]).toBe(
    `---
media:
  - url: ${url}
    alt: A short clip
---

Watch this`
  );
  expect(res.pr.body).toContain("creates a new tweet with a video.");

  // the upload is recorded against the pull request branch
  const { blobs } = await control(page.request);
  const manifest = blobs.find((b: any) =>
    b.pathname.startsWith("manifests/_E2E_tweets/")
  );
  expect(manifest.pathname).toBe(
    "manifests/_E2E_tweets/c11r/timestamp-add-tweet-with-media-watch-this.json"
  );
  const content = await (await page.request.get(manifest.url)).json();
  expect(content.uploads).toEqual([url.slice(FILES.length)]);
});

test("uploads large videos in parts, with progress", async ({ f, page }) => {
  await control(page.request, { partDelayMs: 300 });
  const before = (await control(page.request)).partRequests;
  await page
    .getByLabel("Upload Video", { exact: true })
    .setInputFiles(videoFile("big.mp4", 20 * MB));
  // progress while uploading, and nothing can be submitted meanwhile
  await expect(page.locator("[data-upload-state]")).toBeVisible();
  await expect(page.locator("progress")).toBeVisible();
  await expect(page.locator("[data-media-item=video] video")).toBeVisible({
    timeout: 15000,
  });
  // 20MB in 8MB parts
  expect((await control(page.request)).partRequests - before).toBe(3);
  await control(page.request, { partDelayMs: 0 });
  await f.setText("Tweet Text", "Big one");
  const { req } = await f.submit();
  expect(req.video[0].size).toBe(20 * MB);
});

test("resumes an upload after a reload", async ({ f, page }) => {
  test.setTimeout(60000);
  const file = {
    name: "resume.mp4",
    size: 40 * MB,
    lastModified: 1700000000000,
  }; // 5 parts
  // parts take 2s each, 3 at a time
  await control(page.request, { partDelayMs: 2000 });
  const { partsDone } = await control(page.request);
  await f.setText("Tweet Text", "Resumed upload");
  await chooseFile(page, "Upload Video", file);
  // leave as soon as the first parts are stored, while the rest are sent
  await expect
    .poll(async () => (await control(page.request)).partsDone - partsDone, {
      timeout: 15000,
      intervals: [100],
    })
    .toBeGreaterThanOrEqual(1);
  // the browser saves a part once its response arrives
  await page.waitForTimeout(300);
  await page.reload();
  await control(page.request, { partDelayMs: 0 });

  // the draft and the unfinished upload are offered back
  await expect(page.getByText("Restored your unsent draft")).toBeVisible();
  await expect(f.getByLabel("Tweet Text").locator("textarea")).toHaveValue(
    "Resumed upload"
  );
  await expect(page.getByText(/resume\.mp4 was \d+% uploaded/)).toBeVisible();

  const before = (await control(page.request)).partRequests;
  await chooseFile(page, "Upload Video", file);
  await expect(page.locator("[data-media-item=video] video")).toBeVisible({
    timeout: 15000,
  });
  // only the missing parts were sent again
  const sent = (await control(page.request)).partRequests - before;
  expect(sent).toBeGreaterThan(0);
  expect(sent).toBeLessThan(5);
  await expect(page.getByText(/was \d+% uploaded/)).toHaveCount(0);

  const { req } = await f.submit();
  expect(req.video[0].size).toBe(40 * MB);
  // the complete file arrived
  const { blobs } = await control(page.request);
  expect(blobs.find((b: any) => b.url === req.video[0].url).size).toBe(40 * MB);
});

videoTest("rejects the wrong type and too big files", async ({ f, page }) => {
  const input = page.getByLabel("Upload Video", { exact: true });
  await expect(page.getByText("MP4 video, up to 64 MB")).toBeVisible();
  await input.setInputFiles("./test/assets/kitten.jpg");
  await expect(page.locator("form [role=alert]")).toContainText(
    "Unsupported file type"
  );
  await chooseFile(page, "Upload Video", {
    name: "huge.mp4",
    size: 65 * MB,
    lastModified: 1,
  });
  await expect(page.locator("form [role=alert]")).toContainText(
    "huge.mp4 is 65 MB, the limit is 64 MB"
  );
  // no links on this field
  await expect(page.getByText("Link", { exact: true })).toHaveCount(0);
});

test("uploads cropped images to the store", async ({ f, page }) => {
  await f.setText("Tweet Text", "Cat");
  await f.uploadAndCrop("Upload Images (4 remaining)", "kitten.jpg", "Kitten");
  await expect(page.locator(`img[src^="${FILES}uploads/"]`)).toBeVisible();
  const { req, res } = await f.submit();
  expect(req.media[0]).toMatchObject({
    source: "upload",
    kind: "image",
    contentType: "image/jpeg",
    alt: "Kitten",
  });
  expect(req.media[0].data).toBeUndefined();
  const files = res.commit.changes[0].files;
  // no image in the repository, only the link
  expect(Object.keys(files)).toEqual([
    "tweets/timestamp-add-tweet-with-media-cat.tweet",
  ]);
  expect(files["tweets/timestamp-add-tweet-with-media-cat.tweet"]).toBe(
    `---
media:
  - url: ${req.media[0].url}
    alt: Kitten
---

Cat`
  );
});

test("links to remote files on allowed hosts", async ({ f, page }) => {
  const video = page.getByLabel("Upload Video", { exact: true }).locator("..");
  await page.getByText("Link", { exact: true }).last().click();
  const link = page.getByLabel("Upload Video link");

  await link.fill("http://cdn.example.com/a.mp4");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText(
    "Must be an https:// link"
  );

  await link.fill("https://evil.test/a.mp4");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText(
    "Links must be on example.com, *.example.com"
  );

  await link.fill("https://cdn.example.com/huge.mp4");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("form [role=alert]")).toContainText(
    "File is too big"
  );

  await link.fill("https://cdn.example.com/a.mp4");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(
    page.getByText("Linked: https://cdn.example.com/a.mp4")
  ).toBeVisible();
  expect(video).toBeTruthy();

  await f.setText("Tweet Text", "Linked");
  const { req, res } = await f.submit();
  expect(req.video[0]).toMatchObject({
    url: "https://cdn.example.com/a.mp4",
    source: "remote",
    kind: "video",
  });
  expect(
    res.commit.changes[0].files[
      "tweets/timestamp-add-tweet-with-media-linked.tweet"
    ]
  ).toContain("  - url: https://cdn.example.com/a.mp4\n");
});

base.describe("server checks", () => {
  const post = (request: any, body: object) =>
    request.post("/api/contribute", {
      data: {
        repo: "_E2E_tweets",
        contribution: "tweetMedia",
        authorization: "anon",
        text: "Hi",
        ...body,
      },
    });

  base("refuses files that are not in the store", async ({ request }) => {
    const res = await post(request, {
      video: [
        {
          url: "https://elsewhere.test/x.mp4",
          source: "upload",
          kind: "video",
        },
      ],
    });
    expect((await res.json()).error).toBe(
      "Uploaded file is not in this site's storage"
    );
    const missing = await post(request, {
      video: [
        {
          url: `${FILES}uploads/x/y/gone.mp4`,
          source: "upload",
          kind: "video",
        },
      ],
    });
    expect((await missing.json()).error).toBe(
      "Uploaded file was not found, please upload it again"
    );
  });

  base(
    "refuses uploads on fields that keep files in the repository",
    async ({ request }) => {
      const res = await request.post("/api/contribute", {
        data: {
          repo: "_E2E_tweets",
          contribution: "tweetVideo",
          authorization: "anon",
          text: "Hi",
          media: [
            {
              url: `${FILES}uploads/x/y/a.png`,
              source: "upload",
              kind: "image",
            },
          ],
        },
      });
      expect((await res.json()).error).toBe("media does not accept uploads");
    }
  );

  base("refuses links to hosts that are not allowed", async ({ request }) => {
    const res = await post(request, {
      video: [
        { url: "https://evil.test/x.mp4", source: "remote", kind: "video" },
      ],
    });
    expect((await res.json()).error).toContain(
      "Links must be on example.com, *.example.com"
    );
  });

  base("never fetches private addresses", async ({ request }) => {
    const check = async (url: string) =>
      (
        await (
          await request.post("/api/media/check", {
            data: {
              repo: "_E2E_tweets",
              contribution: "tweetLinks",
              field: "video",
              url,
            },
          })
        ).json()
      ).error;
    expect(await check("http://cdn.test/a.mp4")).toBe(
      "Must be an https:// link"
    );
    for (const url of [
      "https://127.0.0.1/a.mp4",
      "https://[::1]/a.mp4",
      "https://169.254.169.254/latest/meta-data",
      "https://10.1.2.3/a.mp4",
      "https://[::ffff:192.168.1.1]/a.mp4",
      "https://[::ffff:7f00:1]/a.mp4",
      "https://[64:ff9b::a9fe:a9fe]/latest",
    ]) {
      expect(await check(url), url).toMatch(/^Refusing to connect to /);
    }
    // names that resolve to private addresses
    expect(await check("https://localhost/a.mp4")).toBe(
      "Refusing to connect to localhost"
    );
    expect(await check("https://user:pass@cdn.example.com/a.mp4")).toBe(
      "Must not contain credentials"
    );
  });

  base("issues upload tokens only within limits", async ({ request }) => {
    const token = (body: object) =>
      request.post("/api/upload", {
        data: {
          action: "token",
          repo: "_E2E_tweets",
          contribution: "tweetVideo",
          field: "video",
          name: "a.mp4",
          size: MB,
          contentType: "video/mp4",
          ...body,
        },
      });
    // no session yet
    expect((await token({})).status()).toBe(401);
    const session = await request.post("/api/upload", {
      data: {
        action: "session",
        repo: "_E2E_tweets",
        contribution: "tweetVideo",
        authorization: "anon",
      },
    });
    expect(session.status()).toBe(200);

    const ok = await (await token({})).json();
    expect(ok.pathname).toMatch(/^uploads\/[\w-]+\/[a-z0-9]+\/a\.mp4$/);
    expect(ok.url).toBe(FILES + ok.pathname);

    expect((await (await token({ size: 65 * MB })).json()).error).toBe(
      "Files must be up to 64 MB"
    );
    expect(
      (await (await token({ contentType: "image/png" })).json()).error
    ).toBe("Unsupported file type image/png");
    expect((await (await token({ field: "text" })).json()).error).toBe(
      "text is not a media field"
    );
    // resuming someone else's upload
    const other = await token({ pathname: "uploads/someone-else/x/a.mp4" });
    expect(other.status()).toBe(403);
    // resuming one's own
    expect(
      (await (await token({ pathname: ok.pathname })).json()).pathname
    ).toBe(ok.pathname);
  });
});

base("cleans up unused uploads", async ({ request }) => {
  await control(request, { reset: true });
  const put = (pathname: string, days: number, text?: string) =>
    control(request, {
      put: {
        pathname,
        text,
        contentType: text ? "application/json" : "video/mp4",
      },
      age: { [pathname]: days },
    });
  const manifest = (branch: string, uploads: string[]) =>
    put(
      `manifests/_E2E_tweets/${branch}.json`,
      10,
      JSON.stringify({ repo: "_E2E_tweets", branch, uploads })
    );
  await put("uploads/s/1/open.mp4", 30);
  await put("uploads/s/2/merged.mp4", 30);
  await put("uploads/s/3/merged-old.mp4", 100);
  await put("uploads/s/4/closed.mp4", 10);
  await put("uploads/s/5/abandoned.mp4", 10);
  await put("uploads/s/6/recent.mp4", 1);
  await manifest("c11r/pr-open", ["uploads/s/1/open.mp4"]);
  await manifest("c11r/pr-merged", [
    "uploads/s/2/merged.mp4",
    "uploads/s/3/merged-old.mp4",
  ]);
  await manifest("c11r/pr-closed", ["uploads/s/4/closed.mp4"]);

  const url = "/api/cron/media-cleanup";
  expect((await request.get(url)).status()).toBe(401);
  const auth = { headers: { authorization: "Bearer test-cron-secret" } };

  // a dry run deletes nothing
  const dry = await (await request.get(`${url}?dry=1`, auth)).json();
  expect(dry.deleted.length).toBe(4);
  expect((await control(request)).blobs.length).toBe(9);

  const res = await (await request.get(url, auth)).json();
  expect(res.kept).toEqual({ open: 1, merged: 1, recent: 1 });
  const left = (await control(request)).blobs
    .map((b: any) => b.pathname)
    .sort();
  expect(left).toEqual([
    "manifests/_E2E_tweets/c11r/pr-merged.json",
    "manifests/_E2E_tweets/c11r/pr-open.json",
    "uploads/s/1/open.mp4",
    "uploads/s/2/merged.mp4",
    "uploads/s/6/recent.mp4",
  ]);
});
