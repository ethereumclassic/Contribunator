import type { ConfigWithContribution, Field } from "@/types";

import {
  MAX_SIZE_MB,
  MB,
  MEDIA_TYPES,
  MediaKind,
  RemoteUrlOption,
} from "./media";

// What a form field accepts as media, derived from its config. Used by the
// upload route, the link check and the submission check, so that the server
// enforces exactly what the form shows.

export type MediaRules = {
  field: string;
  kinds: MediaKind[];
  contentTypes: string[];
  maxBytes: number;
  storage: "repo" | "blob";
  remoteUrl: RemoteUrlOption;
};

export function mediaRulesOf(
  name: string,
  field: Field
): MediaRules | undefined {
  if (field.type === "media") {
    const kinds = field.accept || ["image", "video"];
    const maxMB =
      field.maxSizeMB || Math.max(...kinds.map((k) => MAX_SIZE_MB[k]));
    return {
      field: name,
      kinds,
      contentTypes: kinds.flatMap((k) => MEDIA_TYPES[k]),
      maxBytes: maxMB * MB,
      storage: "blob",
      remoteUrl: field.remoteUrl || false,
    };
  }
  if (field.type === "images" || field.type === "image") {
    return {
      field: name,
      kinds: ["image"],
      // cropped images are always re-encoded as png or jpeg
      contentTypes: ["image/png", "image/jpeg"],
      maxBytes: (field.fileSizeLimit || MAX_SIZE_MB.image) * MB,
      storage: field.storage || "repo",
      remoteUrl: field.remoteUrl || false,
    };
  }
}

export function mediaRules(
  config: ConfigWithContribution,
  name: string
): MediaRules {
  const field = config.contribution.form.fields[name];
  const rules = field && mediaRulesOf(name, field);
  if (!rules) throw new Error(`${name} is not a media field`);
  return rules;
}

/** every media field of a contribution, by name */
export function allMediaRules(config: ConfigWithContribution) {
  return Object.entries(config.contribution.form.fields)
    .map(([name, field]) => mediaRulesOf(name, field))
    .filter((r): r is MediaRules => !!r);
}
