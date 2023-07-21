import { useField } from "formik";

import type { DyanmicField, Fields } from "@/types";

// this causes weird page loading issues
// instead, load heavy libraries within the component (e.g. image)
// import dynamic from "next/dynamic";
// const components = {
//   text: dynamic(() => import("./textInput")),
//   choice: dynamic(() => import("./choiceInput")),
//   image: dynamic(() => import("./imageInput")),
//   images: dynamic(() => import("./imagesInput")),
//   info: dynamic(() => import("./infoField")),
//   collection: dynamic(() => import("./collectionInput")),
// };

import TextInput from "./textInput";
import ChoiceInput from "./choiceInput";
import ImageInput from "./imageInput";
import ImagesInput from "./imagesInput";
import InfoField from "./infoField";
import CollectionInput from "./collectionInput";
import { useForm } from "../formContext";

const components = {
  text: TextInput,
  choice: ChoiceInput,
  image: ImageInput,
  images: ImagesInput,
  info: InfoField,
  collection: CollectionInput,
};

function FieldItem({ field }: { field: DyanmicField & { name: string } }) {
  // get formik context so it's less expensive
  // TODO optimize this
  const form = useForm();
  const [{ value }] = useField(field.name);
  // we should check if we need to re-render properly
  const resolved: any = { ...field };
  // TODO handle iframe and transform fields...
  Object.entries(field).forEach(([fKey, fValue]) => {
    if (typeof fValue === "function") {
      resolved[fKey] = fValue({ ...form, value });
    }
  });
  // TODO we should unset hidden values
  if (resolved.hidden) {
    return null;
  }
  // @ts-ignore
  const Input = components[field.type];
  // @ts-ignore
  return <Input {...resolved} />;
}

export default function FormFields({ fields }: { fields: Fields }) {
  return (
    <>
      {Object.entries(fields).map(([name, val]) => (
        <FieldItem key={name} field={{ ...val, name }} />
      ))}
    </>
  );
}
