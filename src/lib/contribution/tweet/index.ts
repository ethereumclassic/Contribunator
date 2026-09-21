import { FaTwitter } from "react-icons/fa";

import type { ContributionCommonOptions, ContributionConfig } from "@/types";

import contribution from "@/lib/contribution";

export type TweetConfigInput = Omit<ContributionCommonOptions, "autoMerge"> & {
  /**
   * As for any contribution, plus "schedule": auto-merge only pull requests
   * for scheduled tweets, which do not publish on merge.
   */
  autoMerge?: ContributionCommonOptions["autoMerge"] | "schedule";
  options?: {
    media?: boolean;
    retweet?: boolean;
    reply?: boolean;
    retweetTextRequired?: boolean;
    /** handle of the posting account (without @), enables reply/quote checks */
    account?: string;
    /** show the optional schedule field, default true */
    schedule?: boolean;
  };
};

export default function tweet(opts: TweetConfigInput = {}): ContributionConfig {
  const { autoMerge, ...rest } = opts;
  return contribution({
    title: "Tweet",
    description: "Submit a Tweet to be tweeted on this account if approved",
    icon: FaTwitter,
    color: "blue",
    ...rest,
    autoMerge:
      autoMerge === "schedule" ? ({ data }) => !!data.schedule : autoMerge,
    load: async () => (await import("./tweet.loader")).default(opts),
  });
}
