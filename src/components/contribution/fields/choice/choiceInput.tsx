import { useField } from "formik";

import type { ValidationTypes } from "@/types";

import type { Dynamic, UnwrapDynamic } from "@/types";

import FieldHeader from "@/components/contribution/common/fieldHeader";

import ChoiceDropdown from "./choiceDropdown";
import ChoiceButtons from "./choiceButtons";
import React from "react";
import withDynamicField from "../withDynamicField";

type ChoiceOption = {
  title?: string;
  icon?: React.FC;
  options?: NestedChoiceOptions;
};

export type NestedChoiceOptions = {
  [key: string]: ChoiceOption;
};

export type Props = {
  name: string;
  title?: Dynamic<string>;
  unset?: string;
  info?: Dynamic<string>;
  multiple?: boolean;
  options: NestedChoiceOptions;
  validation?: ValidationTypes;
  as?: "dropdown" | "buttons" | "buttons-inline";
};

const dynamicProps = ["title", "info"] as const;
type DynamicProps = (typeof dynamicProps)[number];

// TODO fix this in UnwrapDynamic
type NonDynamic = Omit<Props, DynamicProps | "name">;
type Unwrapped = NonDynamic &
  UnwrapDynamic<Pick<Props, DynamicProps>, DynamicProps>;

export type ChoiceCompProps = Unwrapped & {
  handleChange: (value: string | undefined) => void;
  field: { value?: string | string[] };
  inline?: boolean;
};

function ChoiceInput(props: UnwrapDynamic<Props, DynamicProps>) {
  const { multiple, validation, name } = props;
  const [field, meta, helpers] = useField(name);
  const inline = props.as == "buttons-inline";
  const as = inline ? "buttons" : props.as || "dropdown";
  const unset =
    props.unset ||
    (!multiple && !validation?.required ? "No Selection" : undefined);
  function handleChange(value: string | undefined) {
    if (!multiple) {
      (document.activeElement as HTMLElement)?.blur();
      helpers.setValue(value);
    } else {
      if (!value) {
        helpers.setValue(undefined);
      } else {
        const values = field.value || [];
        if (values.includes(value)) {
          const newValues = values.filter((v: string) => v !== value);
          helpers.setValue(newValues.length ? newValues : undefined);
        } else {
          helpers.setValue([...values, value]);
        }
      }
    }
  }
  return (
    <div className="form-control">
      <FieldHeader {...{ ...props, ...meta }} />
      {as === "dropdown" && (
        <ChoiceDropdown
          {...props}
          unset={unset}
          field={field}
          handleChange={handleChange}
        />
      )}
      {as === "buttons" && (
        <ChoiceButtons
          {...props}
          inline={inline}
          unset={unset}
          field={field}
          handleChange={handleChange}
        />
      )}
    </div>
  );
}

export default withDynamicField(ChoiceInput, dynamicProps);
