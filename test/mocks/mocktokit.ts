import { join } from "path";
import fs from "fs/promises";

export const testPr = {
  url: "https://github.com/repo/owner/pulls/123",
  number: 123,
  title: "This is my test commit",
};

// scheduled tweet ledger used by the cron route test
export const testLedger = {
  "tweets/due.tweet": {
    status: "pending",
    scheduled: "2020-01-02T03:04:00.000Z",
  },
  "tweets/future.tweet": {
    status: "pending",
    scheduled: "2099-01-02T03:04:00.000Z",
  },
  "tweets/done.tweet": {
    status: "published",
    scheduled: "2020-01-01T00:00:00.000Z",
  },
};

export const dispatched: {
  repo: string;
  event_type: string;
  client_payload: any;
}[] = [];

class Mocktokit {
  constructor() {}

  // test cron route
  async request(route: string, params: any) {
    if (route === "GET /repos/{owner}/{repo}/contents/{path}") {
      if (params.repo === "_E2E_tweets") {
        return {
          data: {
            content: Buffer.from(JSON.stringify(testLedger)).toString("base64"),
          },
        };
      }
      const error: any = new Error("Not Found");
      error.status = 404;
      throw error;
    }
    if (route === "POST /repos/{owner}/{repo}/dispatches") {
      dispatched.push({
        repo: params.repo,
        event_type: params.event_type,
        client_payload: params.client_payload,
      });
      return { status: 204 };
    }
    throw new Error(`Mocktokit: unhandled request ${route}`);
  }

  // test pullRequestHandler
  rest = {
    repos: {
      get: async ({}) => {
        return {
          data: {
            default_branch: "main",
          },
        };
      },
      createOrUpdateFiles: async ({ base }: any) => {
        return {
          base: base || "main",
          commits: [
            {
              sha: "REPLACED_SHA",
            },
          ],
        };
      },
    },
    pulls: {
      create: async (data: any) => {
        return {
          test: data,
          data: {
            html_url: testPr.url,
            title: testPr.title,
            number: testPr.number,
          },
        };
      },
      requestReviewers: async ({ reviewers, team_reviewers }: any) => {
        // noop
        // log.info({ reviewers, team_reviewers });
      },
    },
    issues: {
      addLabels: async ({ labels }: any) => {
        // noop
        // log.info({ labels });
      },
    },
  };

  // test fetchFiles
  repos = {
    async getContent({ path }: { path: string }) {
      // return 404s
      if (path.split("/").pop()?.split(".")[0] === "404") {
        return { status: 404 };
      }
      // core tests are prefixed with _E2E_/, otherwise assume usertest
      const relPath = path.startsWith("_E2E_/")
        ? `test/assets/data/${path.replace("_E2E_/", "")}`
        : `contributions/test/data/${path}`;

      const fileName = join(process.cwd(), relPath);
      try {
        const data = await fs.readFile(fileName, { encoding: "utf8" });
        return {
          data: {
            type: "file",
            content: Buffer.from(data).toString("base64"),
          },
        };
      } catch (e) {
        throw Error(`Test data not found [${path} -> ${fileName}]`);
      }
    },
  };
}

// @ts-ignore
Mocktokit.plugin = () => Mocktokit;

export default Mocktokit;
