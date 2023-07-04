import type { Field } from "@/types";

const locales: Field = {
  type: "choice",
  title: "Language",
  as: "buttons-inline",
  unset: "English",
  options: {
    zh: {
      title: "中文",
    },
    ar: {
      title: "اَلْعَرَبِيَّةُ",
    },
    de: {
      title: "Deutsch",
    },
    es: {
      title: "Español",
    },
    el: {
      title: "Ελληνικά",
    },
    fr: {
      title: "Français",
    },
    he: {
      title: "עִבְרִית",
    },
    hi: {
      title: "हिन्दी",
    },
    hr: {
      title: "Hrvatski",
    },
    it: {
      title: "Italiano",
    },
    ja: {
      title: "日本語",
    },
    ko: {
      title: "한국어",
    },
    ms: {
      title: "Malay",
    },
    nl: {
      title: "Nederlands",
    },
    pt: {
      title: "Português",
    },
    ru: {
      title: "русский",
    },
    th: {
      title: "ภาษาไทย",
    },
    tr: {
      title: "Türk",
    },
    vi: {
      title: "Tiếng Việt",
    },
    "zh-yue": {
      title: "粵語",
    },
  },
};

export default locales;
