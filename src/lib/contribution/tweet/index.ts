import { FaTwitter } from "react-icons/fa";

import type { ContributionCommonOptions, ContributionConfig } from "@/types";

import contribution from "@/lib/contribution";
import type { RemoteUrlOption } from "@/lib/media/media";

export type TweetMediaOptions = {
  /**
   * Images: committed to the repository ("repo", default), uploaded to the
   * Vercel Blob store ("blob"), or not offered (false).
   */
  images?: "repo" | "blob" | false;
  /** offer a video upload (Vercel Blob store), default false */
  video?: boolean;
  /** maximum video size, default 512MB (X's limit) */
  maxVideoMB?: number;
  /** allow links to files elsewhere: true for any host, or a host list */
  remoteUrl?: RemoteUrlOption;
};

export type TweetConfigInput = Omit<ContributionCommonOptions, "autoMerge"> & {
  /**
   * As for any contribution, plus "schedule": auto-merge only pull requests
   * for scheduled tweets, which do not publish on merge.
   */
  autoMerge?: ContributionCommonOptions["autoMerge"] | "schedule";
  options?: {
    /** `false` hides media fields */
    media?: false | TweetMediaOptions;
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
