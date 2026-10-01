import type {
  Contribution,
  ContributionConfig,
  ContributionOptions,
} from "./contribution";

export type AuthType = "github" | "captcha" | "api" | "anon";

/** uploads to the Vercel Blob store, see /api/cron/media-cleanup */
export type MediaStorageConfig = {
  /**
   * Delete uploads used by merged pull requests this many days after they
   * were uploaded. `null` keeps them forever. Default 90.
   */
  retentionDays?: number | null;
  /**
   * Delete uploads that no open or merged pull request uses (abandoned
   * forms, closed pull requests) after this many days. Default 7.
   */
  orphanGraceDays?: number;
};

export type Config = {
  title: string;
  media?: MediaStorageConfig;
  description: string;
  authorization: AuthType[];
  owner: string;
  base?: string;
  branchPrefix: string;
  prPostfix: string;
  addLabels?: string[];
  requestReviewers?: {
    users?: string[];
    teams?: string[];
  };
  repos: { [key: string]: Repo };
};

export type Repo = Omit<Config, "repos"> & {
  name: string;
  githubUrl: string;
  contributions: { [key: string]: ContributionConfig };
};

export type UserConfig = Partial<Omit<Config, "repos">> & {
  repos?: {
    [key: string]: Partial<Omit<Repo, "contributions">> & {
      contributions: { [key: string]: ContributionConfig };
    };
  };
};

export type ConfigWithRepo = Config & {
  repo: Repo;
};

export type ConfigWithContribution = Config & {
  repo: Repo;
  contribution: Contribution;
};
