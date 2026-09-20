import { test, expect } from "@playwright/test";

const url = "/api/cron/publish-scheduled";

test("rejects calls without the cron secret", async ({ request }) => {
  expect((await request.get(url)).status()).toBe(401);
  expect(
    (
      await request.get(url, { headers: { authorization: "Bearer wrong" } })
    ).status()
  ).toBe(401);
});

test("dispatches only repositories with due scheduled tweets", async ({
  request,
}) => {
  const res = await request.get(url, {
    headers: { authorization: "Bearer test-cron-secret" },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const byRepo = Object.fromEntries(body.repos.map((r: any) => [r.repo, r]));
  // has a ledger, one due pending tweet: dispatched
  expect(byRepo["test-owner/_E2E_tweets"]).toEqual({
    repo: "test-owner/_E2E_tweets",
    ledger: true,
    due: ["tweets/due.tweet"],
    dispatched: true,
  });
  // no ledger: skipped, nothing dispatched
  expect(byRepo["test-owner/_E2E_test"]).toEqual({
    repo: "test-owner/_E2E_test",
    ledger: false,
    due: [],
    dispatched: false,
  });
  expect(body.repos.every((r: any) => !r.error)).toBe(true);
});
