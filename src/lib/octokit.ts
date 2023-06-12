import { Octokit } from "@octokit/rest";
import Mocktokit from "@/../test/mocks/mocktokit";
import { e2e } from "@/lib/testEnv";

let exported = Octokit;

if (e2e) {
  // @ts-ignore
  exported = Mocktokit;
}

export default exported;
