import deepObjectMap from "@/lib/helpers/deepObjectMap";
import set from "lodash/set";

const sources = {
  wallets: "content/services/wallets/index.yaml",
  exchanges: "content/services/exchanges/index.yaml",
  channels: "content/community/channels/index.yaml",
  tooling: "content/community/channels/index.yaml",
  endpoint: "content/network/endpoints/index.yaml",
  pools: "content/mining/pools/index.yaml",
  explorers: "content/network/explorers/index.yaml",
  monitors: "content/network/monitors/index.yaml",
  repo: "content/development/repositories/index.yaml",
};

export const keyMap: any = {
  name: "__name",
  url: "__link",
  icon: "__icon",
};

type CatItem = {
  title: string;
  sourceKey: string;
  sourcePath: string;
  showIcons?: boolean;
  showWebsite?: boolean;
  showDescription?: boolean;
  links?: { name: string; required?: string | boolean }[];
  keyMap?: { [key: string]: string };
};

type Categories = {
  [key: string]: {
    title: string;
    options: {
      [key: string]: CatItem;
    };
  };
};

const catConfig: Categories = {
  wallets: {
    title: "Wallet",
    options: {
      web: {
        title: "Web Wallet",
        sourceKey: "web",
        sourcePath: sources.wallets,
      },
      browser: {
        title: "Browser Integrated Wallet",
        sourceKey: "browsers",
        sourcePath: sources.wallets,
      },
      hardware: {
        title: "Hardware Wallet",
        sourceKey: "hardware",
        sourcePath: sources.wallets,
      },
      software: {
        title: "Software Wallet",
        sourceKey: "software",
        sourcePath: sources.wallets,
      },
      other: {
        title: "Other Wallet Product",
        sourceKey: "other",
        sourcePath: sources.wallets,
      },
    },
  },
  exchanges: {
    title: "Exchange",
    options: {
      trustMinimized: {
        title: "Trust-Minimizing Exchange (DEX)",
        sourceKey: "Trust-Minimizing Exchanges",
        sourcePath: sources.exchanges,
      },
      centralizedSpot: {
        title: "Centralized Spot Market (CEX)",
        sourceKey: "Centralized Spot Markets",
        sourcePath: sources.exchanges,
      },
      derivative: {
        title: "Centralized Derivative Market",
        sourceKey: "Centralized Derivative Markets",
        sourcePath: sources.exchanges,
      },
      crossChain: {
        title: "Cross-Chain Swap Exchange",
        sourceKey: "Cross-Chain Swap Exchanges",
        sourcePath: sources.exchanges,
      },
      nfts: {
        title: "NFT Marketplace",
        sourceKey: "NFT Marketplaces",
        sourcePath: sources.exchanges,
      },
      other: {
        title: "Other Exchange Service",
        sourceKey: "Other",
        sourcePath: sources.exchanges,
      },
    },
  },
  social: {
    title: "Social Channels",
    options: {
      chatRooms: {
        title: "General Chat Room",
        sourceKey: "Chat Rooms",
        sourcePath: sources.channels,
        showIcons: true,
      },
      developmentChat: {
        title: "Development Chat Room",
        sourceKey: "Development Chat",
        sourcePath: sources.channels,
        showIcons: true,
      },
      telegramGroups: {
        title: "Telegram Group",
        sourceKey: "Telegram Groups",
        sourcePath: sources.channels,
        showIcons: true,
      },
      forums: {
        title: "Forum",
        sourceKey: "Forums",
        sourcePath: sources.channels,
        showIcons: true,
      },
      youtubeChannels: {
        title: "YouTube Channel or Playlist",
        sourceKey: "Media",
        sourcePath: sources.channels,
        showIcons: true,
      },
      twitter: {
        title: "Twitter Account",
        sourceKey: "Twitter Accounts",
        sourcePath: sources.channels,
        showIcons: true,
      },
      regional: {
        title: "Regional Community Websites",
        sourceKey: "Regional Website",
        sourcePath: sources.channels,
      },
    },
  },
  dev: {
    title: "Mining & Development",
    options: {
      priceSource: {
        title: "Price Source",
        sourcePath: sources.tooling,
        sourceKey: "prices",
      },
      payment: {
        title: "Payment Processor",
        sourcePath: sources.tooling,
        sourceKey: "processors",
      },
      dex: {
        showDescription: true,
        title: "Development Experience",
        sourcePath: sources.tooling,
        sourceKey: "dex",
      },
      endpoint: {
        showWebsite: true,
        title: "RPC Endpoint",
        sourcePath: sources.endpoint,
        sourceKey: "endpoints",
        links: [
          {
            name: "Homepage URL",
            required: "Homepage Required",
          },
          { name: "JSON RPC API URL", required: "RPC URL Required" },
        ],
        keyMap: {
          ...keyMap,
          link2: "__rpcUrl",
        },
      },
      pools: {
        title: "Mining Pool",
        sourcePath: sources.pools,
        sourceKey: "pools",
      },
      explorers: {
        title: "Blockchain Explorer",
        sourcePath: sources.explorers,
        sourceKey: "explorers",
        links: [
          {
            name: "Mainnet URL",
            required: true,
          },
          { name: "Kotti URL" },
          { name: "Mordor URL" },
        ],
        keyMap: {
          ...keyMap,
          url: "__etc",
          link2: "__kotti",
          link3: "__mordor",
        },
      },
      monitors: {
        title: "Network Monitor",
        sourcePath: sources.monitors,
        sourceKey: "monitors",
      },
      repo: {
        showDescription: true,
        title: "Git Repository",
        sourcePath: sources.repo,
        sourceKey: "repos",
      },
    },
  },
};

const options = {};
const categories: { [key: string]: CatItem } = {};

deepObjectMap(catConfig, (key, value) => {
  if (key.endsWith(".title")) {
    set(options, key, value);
  }
  set(categories, key.split(".options.").join("."), value);
});

export { options, categories };
