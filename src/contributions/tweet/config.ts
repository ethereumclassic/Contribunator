import { FaTwitter } from "react-icons/fa";

import { Contribution, TailwindColor } from "@/lib/config";

import generateSchema from "./generateSchema";
import prMetadata from "./prMetadata";

type Suggestion = {
  has?: string;
  hasNo?: string;
  message: string;
};

const suggestions: { [key: string]: Suggestion } = {
  spacing: {
    has: "(?<!\n)\n(?!\n)",
    message: "Use double spaces to separate lines",
  },
  hashtags: {
    hasNo: "[#$]",
    message: "Include some Hashtags",
  },
  emojis: {
    hasNo: "\\p{Emoji_Presentation}",
    message: "Add emojis to your tweet",
  },
  noFirstAt: {
    has: "^@",
    message:
      "Don't start your tweet with `@` (prefix with . to reply properly)",
  },
};

type SuggestionTypes = keyof typeof suggestions;

export function tweetSuggestions(keys: SuggestionTypes[] = []): Suggestion[] {
  if (keys.length === 0) {
    return Object.values(suggestions);
  }
  return keys.map((key) => {
    if (!suggestions[key]) {
      throw new Error(`Invalid suggestion key: ${key}`);
    }
    return suggestions[key];
  });
}

const defaultConfig = {
  type: "tweet",
  name: "tweet",
  title: "Tweet",
  color: "blue" as TailwindColor,
  icon: FaTwitter,
  description: "Submit a tweet",
  options: {
    text: {
      placeholder: "Enter tweet text here",
      suggestions: tweetSuggestions(),
      tags: ["👀", "😂", "✨", "🔥", "💪", "#twitter", "#memes", "#love"],
    },
    // TODO
    // media: true,
    // qutoe: true,
    // threads: true
    // polls: true
  },
};

type TextFieldOptions = {
  placeholder?: string;
  tags?: string[];
  suggestions?: Suggestion[];
};

export type TweetConfig = Contribution & {
  options: { text: TextFieldOptions };
};

export type TweetOptions = Omit<Partial<TweetConfig>, "type"> & {
  name?: string;
};

export default function tweetConfig(opts: TweetOptions = {}): TweetConfig {
  const config: Omit<TweetConfig, "initialValues" | "schema"> = {
    ...defaultConfig,
    ...opts,
    prMetadata,
    options: {
      text: {
        ...defaultConfig.options.text,
        ...opts.options?.text,
      },
    },
  };

  return { ...config, ...generateSchema(config) };
}
