import { useField } from "formik";
import { useForm } from "../formContext";
import React, { useEffect } from "react";
import { DynamicProps } from "@/types";

function DynamicFieldResolver({
  Component,
  keys,
  props,
}: {
  Component: React.FC<any>;
  keys: readonly string[];
  props: any;
}) {
  const form = useForm();
  const [{ value }] = useField(props.name);

  const resolved: any = { ...props };
  [...keys, "hidden"].forEach((key) => {
    // If the prop is a function, invoke it with some props.
    if (typeof resolved[key] === "function") {
      const dynamicResolve: (props: DynamicProps) => any = resolved[key];
      resolved[key] = dynamicResolve({ ...form, value });
    }
  });

  // clear the value if field becomes hidden
  useEffect(() => {
    if (value && resolved.hidden) {
      form.formik.setFieldValue(props.name, undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resolved.hidden]);

  if (resolved.hidden) {
    return null;
  }

  return <Component {...resolved} />;
}

export default function withDynamicField(
  Component: React.FC<any>,
  keys: readonly string[] = []
) {
  return function DynamicField(props: any) {
    // optimization for components without dynamic keys or hidden prop
    if (
      props.hidden === undefined &&
      !Object.keys(props).find(
        (pk) => keys.includes(pk) && typeof props[pk] === "function"
      )
    ) {
      return <Component {...props} />;
    }
    return <DynamicFieldResolver {...{ Component, keys, props }} />;
  };
}
