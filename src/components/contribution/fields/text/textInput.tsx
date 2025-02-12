import { Field, useField } from "formik";
import { HiX } from "react-icons/hi";

import type { Dynamic, UnwrapDynamic } from "@/types";

import FieldHeader from "@/components/contribution/common/fieldHeader";
import Iframe from "@/components/contribution/common/iframe";

import withDynamicField from "../withDynamicField";

export type Suggestion = {
  has?: string;
  hasNo?: string;
  message: string;
};

export type Suggestions = Suggestion[];

export type Props = {
  title?: Dynamic<string>;
  prefix?: Dynamic<string>;
  name: string;
  type?: string;
  info?: Dynamic<string>;
  infoLink?: Dynamic<string>;
  placeholder?: Dynamic<string>;
  transform?: (value: string) => string;
  iframe?: (value: string) => string;
  suggestions?: Suggestions;
  tags?: string[];
  clear?: boolean;
  as?: "input" | "textarea";
  input?:
    | "text"
    | "number"
    | "password"
    | "date"
    | "month"
    | "week"
    | "time"
    | "datetime-local";
};

const dynamicProps = [
  "title",
  "prefix",
  "info",
  "infoLink",
  "placeholder",
] as const;

function TextInput({
  title,
  name,
  prefix,
  clear = false,
  as = "input",
  input,
  info,
  transform,
  iframe,
  suggestions,
  placeholder,
  infoLink,
  tags,
}: UnwrapDynamic<Props, (typeof dynamicProps)[number]>) {
  const [field, meta, helpers] = useField(name);
  const styles = [
    as === "input" && "input input-bordered",
    as === "textarea" && "textarea textarea-bordered h-32",
    prefix && "rounded-l-none border-l-0",
  ]
    .filter((a) => a)
    .join(" ");

  const currentSuggestions =
    field.value &&
    suggestions
      ?.filter(({ has, hasNo }) => {
        if (!has && !hasNo) {
          return true;
        }
        const hasMatch = !has || new RegExp(has, "gu").test(field.value);
        const hasNoMatch = !hasNo || !new RegExp(hasNo, "gu").test(field.value);
        return hasMatch && hasNoMatch;
      })
      .map(({ message }) => message);

  const iframeUrl = field.value && !meta.error && iframe && iframe(field.value);
  return (
    <div className="form-control">
      <FieldHeader
        name={name}
        error={meta.error}
        title={title}
        info={info}
        infoLink={infoLink}
      />
      <div className="space-y-2">
        <div className="flex">
          {/* TODO use formgroup instead */}
          {prefix && (
            <div className="flex bg-base-300 items-center px-2 text-sm rounded-l-md select-none">
              {prefix}
            </div>
          )}
          <div className="flex-auto">
            <Field
              name={name}
              value={field.value || ""}
              as={as}
              type={input}
              className={`w-full ${styles}`}
              placeholder={placeholder}
              onBlur={() => {
                const val = field.value || "";
                const newVal = tags ? val : val.trim();
                helpers.setValue(newVal.trim() === "" ? undefined : newVal);
              }}
              onChange={({
                target: { value },
              }: React.ChangeEvent<HTMLInputElement>) => {
                const val = transform ? transform(value) : value;
                helpers.setValue(val === "" ? undefined : val);
              }}
            />
          </div>
          {clear && !!field.value && (
            <div className="flex items-center ml-2">
              <div
                title="Clear Field"
                className="btn btn-error"
                onClick={() => helpers.setValue(undefined)}
              >
                <HiX />
              </div>
            </div>
          )}
        </div>
        {tags && tags.length > 0 && (
          <div className="text-left text-sm">
            {tags.map((tag) => (
              <div
                key={tag}
                className="inline-flex bg-base-100 cursor-pointer mr-1 rounded-md px-2 py-1 mb-1 hover:bg-base-300 select-none"
                onClick={() => {
                  helpers.setValue(`${field.value || ""}${tag} `);
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        )}
        {/* TODO move to another component */}
        {currentSuggestions && currentSuggestions.length > 0 && (
          <div className="text-xs text-secondary text-left">
            <b>Optional Suggestion: </b>
            {currentSuggestions.join(", ")}
          </div>
        )}
        {iframeUrl && <Iframe url={iframeUrl} />}
      </div>
    </div>
  );
}

export default withDynamicField(TextInput, dynamicProps);
