import get from "lodash/get";
import mapKeys from "lodash/mapKeys";
import set from "lodash/set";
import sortBy from "lodash/sortBy";
import { string } from "yup";

import {
  FaDiscord,
  FaFacebook,
  FaNewspaper,
  FaReddit,
  FaTelegramPlane,
  FaTwitter,
  FaVideo,
  FaYoutube,
} from "react-icons/fa";

import type { ContributionLoaded, Field } from "@/types";
import { options, categories, keyMap } from "./lib/link.categories";

function linkConfig(index: number): Field {
  return {
    type: "text",
    hidden: ({ data }) => !get(categories, data.category)?.links?.[index],
    title: ({ data }) =>
      get(categories, data.category)?.links?.[index]?.name || "",
    placeholder: "e.g. https://www.example.com",
    validation: {
      yup: string()
        .url()
        .when("category", {
          is: (category: string) =>
            !!get(categories, category)?.links?.[index]?.required,
          then: (schema) => schema.required("URL is required"),
        }),
    },
  };
}

export default function linkLoader(): ContributionLoaded {
  return {
    useFilesOnServer({ data: { category } }) {
      const links = get(categories, category).sourcePath;
      if (!links) throw new Error("No sourcePath found for category", category);
      return { links };
    },
    commit: async ({ files: { links }, data: { category, ...data } }) => {
      const sourceKey = get(categories, category).sourceKey;
      const itemsKey = `items.${sourceKey}.items`;
      const oldLinks = get(links.parsed || {}, itemsKey, {});
      const newLinks: any = {};
      const catKeyMap = get(categories, category).keyMap || keyMap;
      oldLinks[data.name] = mapKeys(data, (_v, key) => catKeyMap[key] || key);
      sortBy(Object.keys(oldLinks), (key) => key.toLowerCase()).forEach(
        (key) => {
          newLinks[key] = oldLinks[key];
        }
      );
      return {
        yaml: {
          [links.path]: set(links.parsed || {}, itemsKey, newLinks),
        },
      };
    },
    form: {
      fields: {
        category: {
          type: "choice",
          validation: { required: true },
          title: "Category",
          options,
        },
        name: {
          type: "text",
          title: "Service Name",
          placeholder: ({ decorated }) =>
            `e.g. The world's best ${decorated.category?.markdown || ""}`,
          validation: { required: true, min: 3, max: 50 },
        },
        url: {
          type: "text",
          title: ({ data }) =>
            get(categories, data.category)?.links?.[0]?.name ||
            "Service Homepage or URL",
          placeholder: "e.g. https://www.example.com",
          validation: {
            required: "Service URL is a required field",
            url: true,
          },
        },
        link2: linkConfig(1),
        link3: linkConfig(2),
        icon: {
          title: "Icon",
          type: "choice",
          unset: "No Icon",
          as: "buttons",
          hidden: ({ data }) => !get(categories, data.category)?.showIcons,
          options: {
            facebook: { icon: FaFacebook },
            twitter: { icon: FaTwitter },
            telegram: { icon: FaTelegramPlane },
            discord: { icon: FaDiscord },
            youtube: { icon: FaYoutube },
            video: { icon: FaVideo },
            reddit: { icon: FaReddit },
            newspaper: { icon: FaNewspaper },
          },
        },
        description: {
          title: "Description",
          type: "text",
          as: "textarea",
          placeholder: "e.g. This website contains lots of useful information.",
          hidden: ({ data }) =>
            !get(categories, `${data.category}.showDescription`),
          validation: {
            yup: string().when("category", {
              is: (category: string) =>
                get(categories, `${category}.showDescription`),
              then: (schema) => schema.required(),
            }),
          },
        },
      },
    },
  };
}
