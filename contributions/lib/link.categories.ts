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

export const categories = {
  wallets: {
    title: "Wallet",
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
  exchanges: {
    title: "Exchange",
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
  social: {
    title: "Social Channels",
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
  dev: {
    title: "Mining & Development",
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
      keyMap: {
        url: "etc",
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
};

const options = {};

deepObjectMap(categories, (key, value) => {
  // category options
  if (key.endsWith(".title")) {
    set(
      options,
      key.split(".").slice(0, -1).join(".options.") + ".title",
      value
    );
  }
});

export { options };
