//  TODO, check for session OR API key
// TODO if no email found, should use login@users.noreply.github.com

import { githubConfig } from "@/app/config";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import { NextResponse } from "next/server";
import yaml from "yaml";

interface File {
  path: string;
  mode: "100644" | "100755" | "040000" | "160000" | "120000";
  type: "commit" | "tree" | "blob";
  sha?: string | null;
  content: string;
}

export async function POST(req: Request) {
  // const session = await getServerSession(authOptions);
  // const body = await req.json();

  // // Do we ever need to do this? Perhaps only for PRs, but they can be done by the bot also.
  const client = new Octokit({
    authStrategy: createAppAuth,
    auth: githubConfig,
    // auth: token.accessToken
  });

  const repoConf = {
    owner: "Contribunator",
    repo: "Sample",
  };

  // FETCH
  const commits = await client.repos.listCommits(repoConf);
  const headCommitSHA = commits.data[0].sha;

  // let's read the file we want to update
  const fileName = "testing.yaml";
  console.log({ fileName });
  // return
  const {
    data: { content },
  } = await client.repos.getContent({
    ...repoConf,
    path: fileName,
  });

  const currentData = yaml.parse(
    Buffer.from(content, "base64").toString("utf-8")
  );

  const newData = yaml.stringify([{ time: new Date() }, ...currentData]);

  const files = [
    {
      name: fileName,
      contents: newData,
    },
  ];

  const commitableFiles: File[] = files.map(({ name, contents }) => {
    return {
      path: name,
      mode: "100644",
      type: "commit",
      content: contents,
    };
  });

  // CHECKOUT
  const {
    data: { sha: currentTreeSHA },
  } = await client.git.createTree({
    ...repoConf,
    tree: commitableFiles,
    base_tree: headCommitSHA,
    message: "Updated programatically with Octokit",
    parents: [headCommitSHA],
  });

  // // COMMIT
  const {
    data: { sha: newCommitSHA },
  } = await client.git.createCommit({
    ...repoConf,
    tree: currentTreeSHA,
    author: {
      name: "Istora Mandiri",
      email: "IstoraMandiri@users.noreply.github.com",
    },
    message: `Updated programatically with Octokit`,
    parents: [headCommitSHA],
  });

  // TODO option to requrie pull request
  const base = "main";
  const head = `contribunator/${new Date().getTime()}`; // TODO add a description
  const ref = `refs/heads/${head}`;

  await client.git.createRef({
    ...repoConf,
    sha: newCommitSHA,
    ref,
  });

  // CREATE PR
  const {
    data: { html_url: url },
  } = await client.pulls.create({
    ...repoConf,
    head,
    base,
    title: "Update YAML",
    body: "This was generated by a bot",
  });

  return NextResponse.json({ url });
}
