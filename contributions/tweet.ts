import tweet from "@/lib/contribution/tweet";

export default function tweetConfig({
  account,
  description,
  autoMerge = false,
}: {
  account: string;
  description: string;
  /** merge tweet pull requests automatically once approved; "schedule" for scheduled tweets only */
  autoMerge?: boolean | "schedule";
}) {
  return {
    title: `${account} tweets`,
    addLabels: ["c11r"],
    requestReviewers: { teams: ["tweeters"] },
    description,
    contributions: {
      tweet: tweet({
        title: `Suggest a Tweet for ${account}`,
        autoMerge,
        options: {
          // plain retweets must be possible; X may refuse replies to posts
          // that don't mention the account (quotes are published as a link
          // in the text, which works around that)
          retweetTextRequired: false,
          account: account.replace(/^@/, ""),
          // images are committed to the repository; videos are uploaded to
          // the Vercel Blob store; both may also be links to files elsewhere
          media: { images: "repo", video: true, remoteUrl: true },
        },
        form: {
          description: `${description} Please check the repository rules before submitting to increase the chances that your tweet is accepted.`,
          fields: {
            text: {
              placeholder:
                "e.g. Decentralized, Immutable, Unstoppable!\n\n$ETC #EthereumClassic 🍀",
              tags: [
                "🍀",
                "🚀",
                "💚",
                "🔥",
                "🎉",
                "$ETC",
                "#ETC",
                "#EthereumClassic",
                "#ETCArmy",
                "#ClassicIsComing",
                "#CodeIsLaw",
                "#Decentralization",
                "#DeFi",
                "#BTC",
                "#web3",
                "#Crypto",
                "#NFT",
                "#cryptocurrency",
                "#mining",
                "EthereumClassic.org",
              ],
            },
          },
        },
      }),
    },
  };
}
