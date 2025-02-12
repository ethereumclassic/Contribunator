import { useField } from "formik";
import { HiPlus } from "react-icons/hi";

import type { Dynamic, UnwrapDynamic, Fields, ValidationTypes } from "@/types";

import FieldHeader from "@/components/contribution/common/fieldHeader";
import RemoveButton from "@/components/contribution/common/removeButton";

import FormFields from "../formFields";
import withDynamicField from "../withDynamicField";

export type Props = {
  name: string;
  title: Dynamic<string>;
  fields: Fields;
  info?: Dynamic<string>;
  infoLink?: Dynamic<string>;
  addButton?: Dynamic<boolean | string>;
  validation?: ValidationTypes;
};

const dynamicProps = ["title", "info", "infoLink", "addButton"] as const;

function CollectionInput({
  validation,
  title,
  fields,
  name,
  info,
  infoLink,
  addButton,
}: UnwrapDynamic<Props, (typeof dynamicProps)[number]>) {
  const [field, meta, helpers] = useField(name);
  const limit = validation?.max || 0;
  const collection = field?.value || [];
  const items = collection.length + 1;
  const showItems = limit && items > limit ? limit : items;

  const childFields: Fields[] = [];
  for (let i = 0; i < showItems; i++) {
    const childField: Fields = {};
    Object.entries(fields).forEach(([key, child]) => {
      childField[`${name}[${i}].${key}`] = child;
    });
    childFields.push(childField);
  }

  const remaining = limit ? ` (${limit + 1 - items} remaining)` : "";

  return (
    <>
      <div className="form-control space-y-2">
        <FieldHeader
          name={name}
          title={title && `${title}${remaining}`}
          error={meta.error}
          info={info}
          infoLink={infoLink}
        />
        <div className="flex flex-col space-y-6">
          {childFields.map((childField, i) => {
            const key = `${name}.${i}`;
            const currentValue = collection[i];
            if (i > 0 && addButton && !currentValue) {
              if (Object.keys(collection[i - 1]).length === 0) {
                return null;
              }
              return (
                <div
                  key={key}
                  className="btn bg-white"
                  onClick={() => {
                    helpers.setValue([...collection, {}]);
                  }}
                >
                  {addButton === true ? "Add Item" : addButton}
                  <HiPlus />
                </div>
              );
            }
            return (
              <div
                key={key}
                className={`collection relative rounded-md bg-base-100 bg-opacity-50 space-y-4 -m-2 p-2 ${
                  currentValue
                    ? "opacity-100"
                    : "opacity-50 hover:opacity-100 focus:opacity-100 transition-all first:opacity-100"
                }`}
              >
                <FormFields fields={childField} />
                {currentValue && (
                  <RemoveButton
                    className="btn-xs -top-6 right-2"
                    onClick={() => {
                      const newValues = [...collection];
                      newValues.splice(i, 1);
                      helpers.setValue(
                        newValues.length === 0 ? undefined : newValues
                      );
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default withDynamicField(CollectionInput, dynamicProps);
