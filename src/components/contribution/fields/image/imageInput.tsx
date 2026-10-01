import { useEffect, useRef, useState } from "react";
import { useField } from "formik";
import dynamic from "next/dynamic";
import type { Dynamic, UnwrapDynamic } from "@/types";

import FieldHeader from "@/components/contribution/common/fieldHeader";
import RemoveButton from "@/components/contribution/common/removeButton";
import TextInput from "@/components/contribution/fields/text/textInput";
import Captcha from "@/components/contribution/common/captcha";
import UploadProgress from "@/components/contribution/common/uploadProgress";
import {
  MediaLinkInput,
  UploadCaptchaPrompt,
  UploadOrLink,
} from "@/components/contribution/common/mediaLink";
import { useUploader } from "@/components/contribution/fields/media/useUploader";

import type { MediaItem, RemoteUrlOption } from "@/lib/media/media";

import withDynamicField from "../withDynamicField";

export const dynamicImageProps = ["title", "info"] as const;

const EditImage = dynamic(() => import("./imageEdit"));

export type Props = {
  fileSizeLimit?: number;
  /**
   * Where cropped images go: committed to the repository (default) or
   * uploaded to the Vercel Blob store and referenced by URL.
   */
  storage?: "repo" | "blob";
  /** also allow links to images elsewhere: true for any host, or a list */
  remoteUrl?: RemoteUrlOption;
  title?: Dynamic<string>;
  name: string;
  alt?: boolean | string;
  info?: Dynamic<string>;
  aspectRatio?: number;
};

export type Image = {
  data?: string;
  type?: string;
  editing?: string;
  alt?: string;
  /** set while the cropped image uploads to the blob store */
  pending?: string;
} & Partial<MediaItem>;

export const MB = 1048576;

export const defaultInfo = {
  title: "Upload Image",
  info: "PNG or JPEG",
  fileSizeLimit: 4.3,
};

function infoText(info: string, fileSizeLimit?: number) {
  return fileSizeLimit ? `${info}, up to ${fileSizeLimit}MB` : info;
}

function ImageSelect({
  handleSet,
  fileSizeLimit,
  title,
  info,
  header = true,
}: {
  title: string;
  info: string;
  fileSizeLimit?: number;
  handleSet: (param: { data: string; type: string }) => void;
  /** false when the field shows its own header */
  header?: boolean;
}) {
  return (
    <>
      {header && (
        <FieldHeader title={title} info={infoText(info, fileSizeLimit)} />
      )}
      <input
        type="file"
        accept="image/jpeg, image/png"
        className="file-input file-input-bordered w-full"
        onChange={(event) => {
          const file = event.target.files && event.target.files[0];
          if (!file) return;
          if (fileSizeLimit && file.size > fileSizeLimit * MB) {
            alert(
              `File is too big! Please upload a file less than ${fileSizeLimit}MB.`
            );
            return;
          }
          const data = URL.createObjectURL(file);
          const type = file.type.split("/")[1];
          handleSet({ data, type });
        }}
      />
    </>
  );
}

function ImageInput({
  name,
  alt,
  aspectRatio,
  storage = "repo",
  remoteUrl = false,
  title = defaultInfo.title,
  info = defaultInfo.info,
  fileSizeLimit = defaultInfo.fileSizeLimit,
  handleRemove,
  showErrors = true,
}: UnwrapDynamic<Props, (typeof dynamicImageProps)[number]> & {
  showErrors?: boolean;
  handleRemove?: () => void;
}) {
  // preload the image edit component on the client
  useEffect(() => {
    import("./imageEdit");
  }, []);

  const [field, meta, helpers] = useField<Image | undefined>(name);
  const image: Image = field.value || {};
  // uploads and links are checked against the field, not the list item
  const fieldName = name.replace(/\[\d+\]$/, "");
  const { target, upload, cancel, progress, needCaptcha } =
    useUploader(fieldName);
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [error, setError] = useState<string>();
  const latest = useRef(image);
  latest.current = image;

  // with blob storage, the cropped image is uploaded straight away
  async function uploadCropped(data: string, type?: string) {
    setError(undefined);
    const id = Math.random().toString(36).slice(2);
    helpers.setValue({ data, type, pending: id, alt: latest.current.alt });
    try {
      const blob = await (await fetch(data)).blob();
      const file = new File([blob], `image.${type === "png" ? "png" : "jpg"}`, {
        type: blob.type,
      });
      const result = await upload(id, file, () => uploadCropped(data, type));
      if (latest.current.pending !== id) return; // removed meanwhile
      if (!result) return; // cancelled or waiting for the captcha
      helpers.setValue({
        type,
        alt: latest.current.alt,
        url: result.url,
        source: "upload",
        kind: "image",
        contentType: result.contentType,
        size: result.size,
      });
    } catch (e) {
      helpers.setValue({
        editing: undefined,
        data,
        type,
        alt: latest.current.alt,
      });
      setError(
        `Upload failed: ${e instanceof Error ? e.message : "unknown error"}`
      );
    }
  }

  const remove = () => {
    if (image.pending) cancel(image.pending);
    if (handleRemove) {
      handleRemove();
    } else {
      helpers.setValue(undefined);
    }
  };
  const preview = image.url || image.data;

  return (
    <div className="form-control">
      {/* FILE PICKER */}
      {!preview && !image.editing && (
        <>
          {!!remoteUrl && (
            <>
              <FieldHeader title={title} info={infoText(info, fileSizeLimit)} />
              <UploadOrLink mode={mode} setMode={setMode} />
              <div className="h-2" />
            </>
          )}
          {mode === "upload" ? (
            <ImageSelect
              header={!remoteUrl}
              title={title}
              info={info}
              fileSizeLimit={fileSizeLimit}
              handleSet={({ data, type }) => {
                helpers.setValue({ editing: data, type });
              }}
            />
          ) : (
            <MediaLinkInput
              target={target}
              remoteUrl={remoteUrl}
              label={title}
              onAdd={(item) => helpers.setValue({ ...item, alt: image.alt })}
            />
          )}
        </>
      )}
      {/* EDITING */}
      {(preview || image.editing) && (
        <>
          {!handleRemove && <FieldHeader title={title} />}
          <div className="relative">
            {/* REMOVE BUTTON */}
            {!!field.value && <RemoveButton onClick={remove} />}
            {/* CROP UI */}
            {image.editing && (
              <EditImage
                image={image}
                aspectRatio={aspectRatio}
                handleData={(data) =>
                  storage === "blob"
                    ? uploadCropped(data, image.type)
                    : helpers.setValue({ data, type: image.type })
                }
              />
            )}
            {/* CROPPED IMAGE */}
            {preview && !image.editing && (
              <>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Image Preview"
                    className={`rounded-md checkered border border-base-300 ${
                      image.pending ? "opacity-50" : ""
                    }`}
                  />
                </div>
                {image.pending && (
                  <div className="mt-2">
                    <UploadProgress
                      name="Uploading image"
                      progress={progress[image.pending]}
                      onCancel={remove}
                    />
                  </div>
                )}
                {image.source === "remote" && (
                  <div className="text-xs opacity-60 text-left truncate mt-1">
                    Linked: {image.url}
                  </div>
                )}
                {/* ALT TEXT */}
                {!!alt && (
                  <div className="mt-1">
                    <TextInput
                      name={`${name}.alt`}
                      placeholder={
                        typeof alt === "string" ? alt : "Image Description"
                      }
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
      {needCaptcha && (
        <div className="mt-2">
          <UploadCaptchaPrompt>
            <Captcha />
          </UploadCaptchaPrompt>
        </div>
      )}
      {error && (
        <div className="text-error text-sm text-left mt-1" role="alert">
          {error}
        </div>
      )}
      {showErrors && <FieldHeader error={meta.error} />}
    </div>
  );
}

export default withDynamicField(ImageInput, dynamicImageProps);
