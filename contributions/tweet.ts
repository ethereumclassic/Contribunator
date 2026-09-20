import tweet from "@/lib/contribution/tweet";

export default function tweetConfig({
  account,
  description,
}: {
  account: string;
  description: string;
}) {
  return {
    title: `${account} tweets`,
    addLabels: ["c11r"],
    requestReviewers: { teams: ["tweeters"] },
    description,
    contributions: {
      tweet: tweet({
        title: `Suggest a Tweet for ${account}`,
        options: {
          // X only allows quoting / replying to the account's own posts or
          // posts that mention it, so plain retweets must be possible
          retweetTextRequired: false,
          account: account.replace(/^@/, ""),
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
