import get from "lodash/get";
import mapKeys from "lodash/mapKeys";
import set from "lodash/set";
import sortBy from "lodash/sortBy";

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

import type { ContributionLoaded, VisibleProps } from "@/types";
import { options, categories } from "./lib/link.categories";

const keyMap: any = {
  name: "__name",
  link: "__link",
  icon: "__icon",
};

function visible(key: string) {
  return ({ formik }: VisibleProps) => {
    const cat = formik.getFieldProps("category").value;
    return cat && get(categories, `${cat}.${key}`);
  };
}

export default function linkLoader(): ContributionLoaded {
  return {
    useFilesOnServer({ data: { category } }) {
      const links = get(categories, `${category}.sourcePath`);
      if (!links) throw new Error("No sourcePath found for category", category);
      return { links };
    },
    commit: async ({ files: { links }, data: { category, ...data } }) => {
      const sourceKey = get(categories, `${category}.sourceKey`);
      // TODO itemsKey into an option?
      const itemsKey = `items.${sourceKey}.items`;
      // upsert the existing object, sort by name
      const oldLinks = get(links.parsed || {}, itemsKey, {});
      const newLinks: any = {};

      const catKeyMap = get(categories, `${category}.keyMap`) || keyMap;

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
          title: "Name", // TODO option to make this dynamic
          placeholder: "e.g. My Website Name",
          validation: { required: true, min: 3, max: 50 },
        },
        link: {
          type: "text",
          title: "URL",
          placeholder: "e.g. https://www.example.com",
          validation: { required: true, url: true },
        },
        icon: {
          title: "Icon",
          type: "choice",
          unset: "No Icon",
          as: "buttons",
          visible: visible("showIcons"),
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
          visible: visible("showDescription"),
        },
      },
    },
  };
}
