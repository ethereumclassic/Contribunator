"use client";

import { useRef, useState } from "react";
import { useField } from "formik";
import Cropper, { ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";

import TextInput from "./textInput";
import { HiCheckCircle, HiXCircle } from "react-icons/hi";
import FieldHeader from "./fieldHeader";

type Image = {
  url: string;
  type: string;
};

function EditImage({
  image,
  handleData,
  aspectRatio,
}: {
  image: Image;
  handleData: (dataUrl: string) => void;
  aspectRatio?: number;
}) {
  const cropperRef = useRef<ReactCropperElement>(null);
  return (
    <div className="relative">
      <Cropper
        src={image.url}
        style={{ height: 400, width: "100%" }}
        autoCropArea={1}
        aspectRatio={aspectRatio}
        ref={cropperRef}
      />
      <div
        className="btn absolute bottom-2 left-2 btn-success gap-2"
        onClick={() => {
          if (!cropperRef.current) return;
          const cropper = cropperRef.current.cropper;
          const imageData = cropper.getCroppedCanvas().toDataURL(image.type);
          handleData(imageData);
        }}
      >
        <HiCheckCircle />
        Confirm Crop
      </div>
    </div>
  );
}

function ImageSelect({ handleSet }: { handleSet: (data: any) => void }) {
  return (
    <>
      <FieldHeader title="Upload an Image" info="JPEG and PNG supported" />
      <input
        type="file"
        accept="image/jpeg, image/png"
        className="file-input file-input-bordered w-full"
        onChange={(event) => {
          const file = event.target.files && event.target.files[0];
          if (!file) return;
          if (file.size > 1048576) {
            alert("File is too big! Please upload a file less than 1MB.");
            return;
          }
          const url = URL.createObjectURL(file);
          handleSet({ url, type: file.type });
        }}
      />
    </>
  );
}

export function ImagesInput({ name, limit }: { name: string; limit: number }) {
  const [field] = useField(name);
  const values = field.value || [];
  let firstEmptySlot = 0;
  const imageFields = new Array(limit).fill(null).map((_, i) => {
    const exists = values[i] && values[i] !== null;
    if (!exists && !firstEmptySlot) {
      firstEmptySlot = i + 1;
    }
    return {
      name: `${name}[${i}]`,
      show: exists || i + 1 === firstEmptySlot,
    };
  });
  return (
    <>
      {imageFields
        .filter(({ show }) => show)
        .map((field) => (
          <ImageInput key={field.name} {...field} />
        ))}
    </>
  );
}

export default function ImageInput({
  name,
  aspectRatio,
}: {
  name: string;
  aspectRatio?: number;
}) {
  const altTextName = `alt_text_${name}`;
  const [field, meta, helpers] = useField(name);
  const [, , altHelpers] = useField(altTextName);
  const [image, setImage] = useState<null | Image>(null);
  const isEditing = field.value === "editing";
  return (
    <div className="form-control relative">
      {/* FILE PICKER */}
      {!image && (
        <ImageSelect
          handleSet={(data) => {
            helpers.setValue("editing");
            setImage(data);
          }}
        />
      )}
      {/* REMOVE BUTTON */}
      {!!field.value && (
        <div
          className="btn btn-sm btn-error absolute top-2 right-2 z-10 gap-2"
          onClick={() => {
            setImage(null);
            altHelpers.setValue("");
            helpers.setValue("");
          }}
        >
          <HiXCircle /> Remove
        </div>
      )}
      {/* CROP UI */}
      {isEditing && image && (
        <>
          <EditImage
            image={image}
            aspectRatio={aspectRatio}
            handleData={helpers.setValue}
          />
        </>
      )}
      {/* CROPPED IMAGE */}
      {field.value && !isEditing && (
        <>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={field.value} alt="Image Preview" className="rounded-md" />
          </div>
          <div className="-mt-2">
            <TextInput
              name={altTextName}
              placeholder="Optional image description"
            />
          </div>
        </>
      )}
      <FieldHeader error={meta.error} />
    </div>
  );
}
