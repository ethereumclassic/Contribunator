import {
  ConfigWithContribution,
  Data,
  DecoratedData,
  DecoratedDataItem,
  DynamicProps,
  ExtractedImagesFlat,
} from "@/types";

import memoize from "lodash/memoize";

import set from "lodash/set";
import get from "lodash/get";
import slugify from "./slugify";
import { getTimeStamp } from "./timestamp";
import { COMMIT_REPLACE_SHA } from "../constants";

type Path = (string | number)[];

type DecorateFormDataProps = {
  timestamp?: string;
  data: Data;
  config: ConfigWithContribution;
};

export type DecorateFormData = {
  data: Data;
  decorated: DecoratedData;
  images: ExtractedImagesFlat;
};

function decorateFormDataRaw({
  config: { contribution, repo },
  data,
  timestamp = getTimeStamp(), // only used to render preview
}: DecorateFormDataProps): DecorateFormData {
  // todo also ensure the data is ordered
  // in the future we can apply transformations to the data here

  const images: ExtractedImagesFlat = {};
  const decorated: DecoratedData = {};
  const orderedData: Data = {};

  // TODO don't use any
  const decorateDeep = (val: any, path: Path = []) => {
    // reorder to match the form definition
    const orderedIterate = (field = contribution.form.fields) => {
      const sorted: string[] = [];
      Object.keys(field).forEach((key) => {
        if (val[key]) sorted.push(key);
      });
      sorted.forEach((key) => decorateDeep(val[key], [...path, key]));
    };
    // skip matching if we're at the object root
    if (path.length === 0) {
      orderedIterate();
      return;
    }
    // iterate sequentially over object arrays
    if (Array.isArray(val) && typeof val[0] === "object") {
      Object.values(val).forEach((item, i) => decorateDeep(item, [...path, i]));
      return;
    }

    // match fields
    const iterator = typeof path[path.length - 1] === "number";
    // create a query path to get from form definition
    const query = path
      .map((p) => (typeof p === "number" ? "fields" : p))
      .slice(0, iterator ? -1 : undefined);

    // traverse the path and get parent field titles
    const field = get(contribution.form.fields, query);

    // go deeper if we're a collection
    if (field.type === "collection") {
      orderedIterate(field.fields);
      return;
    }

    // get the title recursively
    const fullTitle = path
      .map((p, i) => {
        if (typeof p === "number") {
          return `[${p + 1}]`;
        } else {
          const parent = get(contribution.form.fields, query.slice(0, i + 1));
          // if the title is a function, call it with our data
          if (typeof parent?.title === "function") {
            const titleFn = parent.title as (p: DynamicProps) => string;
            // TODO see below, required decorated data may not be popualted at this point
            return titleFn({
              data,
              decorated,
              value: val,
            });
          }
          return parent?.title || p;
        }
      })
      .filter((p) => p) // remove empty items
      .join(" ");

    const item: DecoratedDataItem = {
      field,
      fullTitle,
      name: query[query.length - 1],
      path: path.join("."),
      data: val,
    };

    if (["image", "images"].includes(field.type)) {
      const title = contribution.imageName
        ? contribution.imageName({ data })
        : `${contribution.title} ${fullTitle} ${val.alt || ""}`;
      item.fileName = `${timestamp}-${slugify(title, false)}.${val.type}`;
      item.filePath = `${contribution.imagePath}${item.fileName}`;
      const githubPrefix = `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${COMMIT_REPLACE_SHA}/`;
      item.markdown = `![${val.alt || ""}](${githubPrefix}${item.filePath})${
        val.alt ? `\n*${val.alt}*` : ""
      }`;
      images[item.filePath] = val.data;
    }

    if (field.type === "choice") {
      item.markdown = (Array.isArray(val) ? val : [val])
        .map((item: string) => {
          const path = item
            .split(".")
            .map((key) => ["options", key])
            .flat();
          return get(field, path)?.title || val;
        })
        .join(", ");
    }

    set(decorated, path, item);
    set(orderedData, path, val);
  };

  // we need to decorate the data twice so we can fully populated data in generated titles
  decorateDeep(data);
  // TODO fix this hack?
  decorateDeep(data);

  return { images, decorated, data: orderedData };
}

export const decorateFormData = memoize(
  decorateFormDataRaw,
  ({ config: { contribution, repo }, data, timestamp }) =>
    JSON.stringify({
      contribution: contribution.name,
      repo: repo.name,
      data,
      timestamp,
    })
);
