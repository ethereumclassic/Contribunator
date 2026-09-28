import { useEffect, useState } from "react";

import type { DynamicProps } from "@/types";

import { useForm } from "../formContext";

export type Warning = (
  props: DynamicProps
) => string | undefined | Promise<string | undefined>;

export default function FieldWarning({
  warning,
  value,
}: {
  warning: Warning;
  value: any;
}) {
  const form = useForm();
  const [message, setMessage] = useState<string>();

  // re-run when any form value changes, the warning may depend on other fields
  const key = JSON.stringify(form.formik.values);
  useEffect(() => {
    let current = true;
    Promise.resolve(warning({ ...form, value }))
      .catch(() => undefined)
      .then((result) => current && setMessage(result));
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  if (!message) return null;
  return (
    <div className="text-xs text-warning text-left">
      <b>Warning: </b>
      <span>{message}</span>
    </div>
  );
}
