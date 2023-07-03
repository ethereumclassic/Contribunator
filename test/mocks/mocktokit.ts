// TODO test with genreated title
import { join } from "path";
import fs from "fs/promises";

import log from "@/lib/log";

export const testPr = {
  url: "https://github.com/repo/owner/pulls/123",
  number: 123,
  title: "This is my test commit",
};

class Mocktokit {
  constructor() {}

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
      try {
        // reject strings that don't start with test
        if (!path.startsWith("test/")) {
          throw new Error("Warning: Not requesting test data");
        }
        // read data from test/data
        const fileName = join(
          process.cwd(),
          "test/assets/data",
          path.replace("test/", "")
        );
        const data = await fs.readFile(fileName, { encoding: "utf8" });
        return {
          data: {
            type: "file",
            content: Buffer.from(data).toString("base64"),
          },
        };
      } catch (e) {
        log.warn("404", e as Error);
        return { status: 404 };
      }
    },
  };
}

// @ts-ignore
Mocktokit.plugin = () => Mocktokit;

export default Mocktokit;
