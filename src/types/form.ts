import type { Schema } from "yup";
import type { FormikProps } from "formik";

import type { ConfigWithContribution } from "./config";
import type {
  FetchedFiles,
  Authorized,
  E2ETestResponse,
  Body,
} from "./pullRequest";

import type { Props as ChoiceInput } from "@/components/contribution/fields/choiceInput";
import type { Props as CollectionInput } from "@/components/contribution/fields/collectionInput";
import type { Props as ImageInput } from "@/components/contribution/fields/imageInput";
import type { Props as ImagesInput } from "@/components/contribution/fields/imagesInput";
import type { Props as InfoField } from "@/components/contribution/fields/infoField";
import type { Props as TextInput } from "@/components/contribution/fields/textInput";
import { Decorated } from "@/lib/helpers/decorateFormData";

export type { NestedChoiceOptions } from "@/components/contribution/fields/choiceInput";
export type {
  Suggestion,
  Suggestions,
} from "@/components/contribution/fields/textInput";

export type Choice = { type: "choice" } & Omit<ChoiceInput, "name">;
export type Collection = { type: "collection" } & Omit<CollectionInput, "name">;
export type Image = { type: "image" } & Omit<ImageInput, "name">;
export type Images = { type: "images" } & Omit<ImagesInput, "name">;
export type Info = { type: "info" } & Omit<InfoField, "name">;
export type Text = { type: "text" } & Omit<TextInput, "name">;

type GenericField = Choice | Collection | Image | Images | Info | Text;

export type RegexValidation = {
  regex: RegExp;
  message?: string;
};

export type ValidationTypes = {
  required?: string | boolean;
  url?: string | boolean;
  email?: string | boolean;
  matches?: RegexValidation;
  min?: number;
  max?: number;
  yup?: Schema<unknown>;
};

export type Field = {
  validation?: ValidationTypes;
  hidden?: boolean;
} & GenericField;

export type DynamicPropertyProps = {
  value: any;
  formik: FormikContext;
  config: ConfigWithContribution;
} & Decorated;

type DynamicProperties<T> = {
  [P in keyof T]: T[P] | ((props: DynamicPropertyProps) => T[P]);
};

export type DyanmicField = Exclude<
  DynamicProperties<Field>,
  "type" | "validation"
> & {
  type: string;
  validation?: ValidationTypes;
};

export type Fields = { [key: string]: DyanmicField };

export type Form = {
  title?: string;
  description?: string;
  fields: Fields;
};

export type FormikContext = FormikProps<Body>;

export type BaseFormProps = {
  formik: FormikContext;
  config: ConfigWithContribution;
};

export type FormProps = BaseFormProps & {
  files?: FetchedFiles;
  user?: Authorized;
};

export type PrMetaResponse = {
  title: string;
  number: number;
  url: string;
};

export type SubmitState = {
  pr?: PrMetaResponse;
  error?: string;
  submitting?: boolean;
  confirming?: boolean;
  body?: Body;
  test?: E2ETestResponse;
  mounting?: boolean;
};
