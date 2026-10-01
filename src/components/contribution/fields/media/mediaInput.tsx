import { useEffect, useRef, useState } from "react";
import { useField } from "formik";

import type { Dynamic, UnwrapDynamic, ValidationTypes } from "@/types";

import FieldHeader from "@/components/contribution/common/fieldHeader";
import RemoveButton from "@/components/contribution/common/removeButton";
import UploadProgress from "@/components/contribution/common/uploadProgress";
import Captcha from "@/components/contribution/common/captcha";
import {
  MediaLinkInput,
  UploadCaptchaPrompt,
  UploadOrLink,
} from "@/components/contribution/common/mediaLink";
import TextInput from "@/components/contribution/fields/text/textInput";

import {
  MAX_SIZE_MB,
  MB,
  MEDIA_TYPES,
  MediaItem,
  MediaKind,
  RemoteUrlOption,
  formatBytes,
  kindOfContentType,
} from "@/lib/media/media";
import {
  ResumeRecord,
  forgetUpload,
  pendingUploads,
  resumeKey,
  uploadedBytes,
} from "@/lib/upload/uploader";

import { useUploader } from "./useUploader";

import { HiExclamation } from "react-icons/hi";

import withDynamicField from "../withDynamicField";

export type Props = {
  title?: Dynamic<string>;
  info?: Dynamic<string>;
  name: string;
  /** what may be uploaded or linked, default images and videos */
  accept?: MediaKind[];
  /** how many files, default 1 */
  max?: number;
  /** per file, default what X accepts (5MB images, 512MB video) */
  maxSizeMB?: number;
  /** allow links to files elsewhere: true for any host, or a host list */
  remoteUrl?: RemoteUrlOption;
  /** ask for a description (alt text); a string sets the placeholder */
  alt?: boolean | string;
  validation?: ValidationTypes;
};

const dynamicProps = ["title", "info"] as const;

type Item = MediaItem & { pending?: string };

const KIND_NAMES: Record<MediaKind, string> = {
  image: "JPEG, PNG, WebP or GIF",
  video: "MP4 video",
};

function describe(accept: MediaKind[], maxBytes: number) {
  return `${accept.map((k) => KIND_NAMES[k]).join(" or ")}, up to ${formatBytes(
    maxBytes
  )}`;
}

function Preview({ item }: { item: Item }) {
  const className = "rounded-md border border-base-300 mx-auto max-h-96";
  if (item.kind === "video") {
    return (
      <video
        src={item.url}
        controls
        preload="metadata"
        className={`${className} w-full bg-black`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt="Preview" className={`${className} checkered`} />
  );
}

function MediaInput({
  title = "Upload Media",
  info,
  name,
  accept = ["image", "video"],
  max = 1,
  maxSizeMB,
  remoteUrl = false,
  alt,
}: UnwrapDynamic<Props, (typeof dynamicProps)[number]>) {
  const [field, meta, helpers] = useField<Item[] | undefined>(name);
  const items: Item[] = field.value || [];
  const { target, upload, cancel, progress, needCaptcha } = useUploader(name);

  const maxBytes =
    (maxSizeMB || Math.max(...accept.map((k) => MAX_SIZE_MB[k]))) * MB;
  const contentTypes = accept.flatMap((k) => MEDIA_TYPES[k]);

  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [error, setError] = useState<string>();
  const [resumable, setResumable] = useState<
    (ResumeRecord & { key: string })[]
  >([]);
  // uploads finish after re-renders: always work on the latest list
  const latest = useRef(items);
  latest.current = items;
  const setItems = (next: Item[]) =>
    helpers.setValue(next.length ? next : undefined);

  // unfinished uploads from an earlier visit
  useEffect(() => {
    pendingUploads(target).then(setResumable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startUpload(file: File) {
    setError(undefined);
    const kind = kindOfContentType(file.type);
    if (!kind || !contentTypes.includes(file.type)) {
      setError(
        `Unsupported file type, please choose ${describe(accept, maxBytes)}`
      );
      return;
    }
    if (file.size > maxBytes) {
      setError(
        `${file.name} is ${formatBytes(file.size)}, the limit is ${formatBytes(
          maxBytes
        )}`
      );
      return;
    }
    const id = Math.random().toString(36).slice(2);
    const replace = (item?: Item) =>
      setItems(
        latest.current.flatMap((it) =>
          it.pending === id ? (item ? [item] : []) : [it]
        )
      );
    setItems([
      ...latest.current,
      { pending: id, url: "", source: "upload", kind, name: file.name },
    ]);
    setResumable((r) => r.filter((rec) => rec.key !== resumeKey(target, file)));
    try {
      const result = await upload(id, file, () => startUpload(file));
      replace(
        result && {
          url: result.url,
          source: "upload",
          kind,
          contentType: result.contentType,
          size: result.size,
          name: file.name,
        }
      );
    } catch (e) {
      replace();
      setError(
        `Upload of ${file.name} failed: ${
          e instanceof Error ? e.message : "unknown error"
        }. Choose the file again to continue where it stopped.`
      );
      pendingUploads(target).then(setResumable);
    }
  }

  const canAdd = items.length < max;
  const remaining = max > 1 ? ` (${max - items.length} remaining)` : "";
  const fieldError =
    meta.touched || meta.error?.toString().includes("wait")
      ? meta.error
      : undefined;

  return (
    <div className="form-control space-y-2">
      {items.length > 0 && <FieldHeader title={title} />}
      {/* EXISTING ITEMS */}
      {items.map((item, i) =>
        item.pending ? (
          <UploadProgress
            key={item.pending}
            name={item.name || "file"}
            progress={progress[item.pending]}
            onCancel={() => cancel(item.pending!, item.name)}
          />
        ) : (
          <div key={item.url} className="space-y-1" data-media-item={item.kind}>
            <div className="relative">
              <RemoveButton
                onClick={() => setItems(items.filter((_, j) => j !== i))}
              />
              <Preview item={item} />
            </div>
            <div className="text-xs opacity-60 text-left truncate">
              {item.source === "remote" ? "Linked: " : "Uploaded: "}
              {item.source === "remote" ? item.url : item.name}
              {!!item.size && ` · ${formatBytes(item.size)}`}
            </div>
            {!!alt && (
              <TextInput
                name={`${name}[${i}].alt`}
                placeholder={
                  typeof alt === "string"
                    ? alt
                    : item.kind === "video"
                    ? "Video Description"
                    : "Image Description"
                }
              />
            )}
          </div>
        )
      )}

      {/* ADD ANOTHER */}
      {canAdd && (
        <div className="space-y-2">
          <FieldHeader
            title={
              items.length ? `Add another${remaining}` : `${title}${remaining}`
            }
            info={info || describe(accept, maxBytes)}
          />
          {!!remoteUrl && <UploadOrLink mode={mode} setMode={setMode} />}

          {mode === "upload" && (
            <>
              {resumable.map((rec) => (
                <div
                  key={rec.key}
                  className="alert bg-base-100 border-base-300 text-sm py-2 text-left"
                >
                  <HiExclamation className="text-warning shrink-0" />
                  <span className="flex-1">
                    <b>{rec.name}</b> was{" "}
                    {Math.round((uploadedBytes(rec) / rec.size) * 100)}%
                    uploaded. Choose it again below to continue.
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      forgetUpload(rec.key);
                      setResumable((r) => r.filter((x) => x.key !== rec.key));
                    }}
                  >
                    Discard
                  </button>
                </div>
              ))}
              <input
                type="file"
                accept={contentTypes.join(", ")}
                className="file-input file-input-bordered w-full"
                aria-label={title}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) startUpload(file);
                }}
              />
            </>
          )}

          {mode === "link" && (
            <MediaLinkInput
              target={target}
              remoteUrl={remoteUrl}
              label={title}
              onAdd={(item) => setItems([...latest.current, item])}
            />
          )}

          {needCaptcha && (
            <UploadCaptchaPrompt>
              <Captcha />
            </UploadCaptchaPrompt>
          )}
        </div>
      )}

      {error && (
        <div className="text-error text-sm text-left" role="alert">
          {error}
        </div>
      )}
      {fieldError && typeof fieldError === "string" && (
        <FieldHeader name={name} error={fieldError} />
      )}
    </div>
  );
}

export default withDynamicField(MediaInput, dynamicProps);
