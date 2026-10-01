import slugify from "@/lib/helpers/slugify";
import prMetadata from "./tweet.prMetadata";
import { Commit } from "@/types";
import { normalizeTweetUrl } from "./tweetUrl";
import { scheduleToIso } from "./tweetSchedule";

type Image = {
  data?: string;
  /** uploaded to the blob store or linked */
  url?: string;
  alt?: string;
  type?: string;
};

type Data = {
  media?: Image[];
  video?: { url: string; alt?: string }[];
  quoteType?: string;
  quoteUrl?: string;
  text?: string;
  schedule?: string;
};

// alt text is free text: quote it when YAML would read it differently
function yamlString(value: string) {
  return /^[\w\s.,!?'()-]+$/.test(value) && !/^\s|\s$/.test(value)
    ? value
    : JSON.stringify(value);
}

const tweetCommit: Commit = async (props) => {
  const { timestamp } = props;
  const data = props.data as Data;
  const { title } = prMetadata(props);
  const media: { [key: string]: string } = {};
  const hasQuote = data.quoteType && data.quoteUrl;
  // files stored elsewhere are referenced by URL, twitter-together fetches
  // them when publishing
  const linked = [...(data.media || []), ...(data.video || [])].filter(
    (m) => m.url
  );
  const committed = (data.media || []).filter((m) => !m.url && m.data);
  const hasMedia = linked.length > 0 || committed.length > 0;
  const schedule = scheduleToIso(data.schedule);
  let transformed = "";
  // HEADER START: todo add other types
  if (hasQuote || hasMedia || schedule) {
    transformed += `---\n`;
    if (hasQuote) {
      transformed += `${data.quoteType}: ${normalizeTweetUrl(
        data.quoteUrl as string
      )}\n`;
    }
    if (hasMedia) {
      transformed += `media:
${committed
  .map(({ data, alt = "", type }: Image, i: number) => {
    const fileName = slugify(`${timestamp} ${title} ${alt}`, {
      append: i, // does not append if i is 0
    });
    const filePath = `${fileName}.${type}`;
    const fileDest = `media/${filePath}`;
    let mediaString = `  - file: ${filePath}\n`;
    if (alt) {
      mediaString += `    alt: ${yamlString(alt)}\n`;
    }
    media[fileDest] = data as string;
    return mediaString;
  })
  .join("")}${linked
        .map(
          ({ url, alt }) =>
            `  - url: ${url}\n${alt ? `    alt: ${yamlString(alt)}\n` : ""}`
        )
        .join("")}`;
    }
    if (schedule) {
      // informational in the tweet file, the merge is scheduled via the PR body
      transformed += `schedule: ${schedule}\n`;
    }
    transformed += `---\n\n`;
  }
  // HEADER END
  if (data.text) {
    transformed += data.text;
  }

  const tweetFileName = slugify(`${timestamp} ${title}`);

  return {
    images: media, // these will get converted in pullRequestHandler
    files: {
      [`tweets/${tweetFileName}.tweet`]: transformed.trim(),
    },
  };
};

export default tweetCommit;
