import { HiNewspaper } from "react-icons/hi";
import genericConfig, {
  ExtendedGenericInput,
  GenericConfig,
} from "@/contributions/generic/config";

import timestamp from "@/lib/timestamp";

export type NewsConfig = ExtendedGenericInput & {
  options: {
    //
    collectionPath: string;
  };
};

export default function newsConfig({
  options: { collectionPath, ...options },
  ...opts
}: NewsConfig): GenericConfig {
  if (!collectionPath) {
    throw new Error("News config requires a collectionPath");
  }

  return genericConfig({
    title: "News Item",
    description: "A link to an article on an external website",
    icon: HiNewspaper,
    color: "green",
    ...opts,
    useFilesOnServer: {
      news: collectionPath,
    },
    options: {
      ...options,
      commit: async ({ files, fields }) => {
        return {
          yaml: {
            [files.news.path]: [
              { date: timestamp("YYYY-MM-DD"), ...fields },
              ...files.news.parsed,
            ],
          },
        };
      },
      fields: {
        name: {
          type: "text",
          title: "Article Name",
          placeholder: "e.g. Hard Fork Success!",
          validation: { required: true, min: 10, max: 50 },
        },
        link: {
          type: "text",
          title: "Article URL",
          placeholder: "e.g. https://www.example.com",
          validation: { required: true, url: true },
        },
        author: {
          type: "text",
          title: "Author Name",
          placeholder: "e.g. Johnny Dapp",
        },
        source: {
          type: "text",
          title: "Source Name",
          placeholder: "e.g. CoinDesk",
        },
        tags: {
          type: "choice",
          multiple: true,
          as: "buttons",
          validation: { required: true, max: 5 },
          title: "Tags",
          options: {
            announcement: { title: "Announcements" },
            development: { title: "Development" },
            education: { title: "Education" },
            event: { title: "Events" },
            exchange: { title: "Exchanges" },
            guide: { title: "Guides" },
            hardfork: { title: "Hard Forks" },
            media: { title: "Media" },
            mining: { title: "Mining" },
            podcast: { title: "Podcasts" },
            teams: { title: "Teams" },
            trading: { title: "Trading" },
            wallet: { title: "Wallets" },
            philosophy: { title: "Philosophy" },
            series: { title: "Series" },
          },
        },
      },
    },
  });
}
