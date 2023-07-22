import { PrMetadata, DecoratedDataItem } from "@/types";

function deepReport(decorated: DecoratedDataItem): string {
  let r = "";
  const report = (fields: DecoratedDataItem, depth = 2) => {
    Object.values(fields).forEach((item) => {
      // we only deal with objects here
      if (typeof item !== "object") {
        return;
      }
      if (item.field) {
        // render the field to markdown
        const heading = "#".repeat(depth < 6 ? depth : 6);
        const str = item.markdown || item.data;
        r += `${heading} ${item.fullTitle}\n${str}\n\n`;
      } else {
        report(item, depth + 0.5);
      }
    });
  };
  report(decorated);
  return r.trim();
}

const prMetadata: PrMetadata = ({
  decorated,
  config: {
    contribution: { title },
  },
}) => {
  const itemName = decorated.title?.data || decorated.name?.data;
  return {
    title: `Add ${title}${itemName ? `: ${itemName}` : ""}`,
    message: `This PR adds a new ${title}:

${deepReport(decorated)}`,
  };
};

export default prMetadata;
