import { Formik, FormikProps } from "formik";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Yup from "yup";

import config from "@/util/config";
import commonSchema from "@/util/commonSchema";

import SubmitButton from "./submitButton";
import Submitted from "./submitted";
import GenericOptions from "./genericOptions";

type PassedProps = {
  className?: string;
  user?: any;
  repo: string;
};
type Config = {
  schema: any;
  contribution: string;
  initialValues?: any;
};

export type FormProps = {
  formik: FormikProps<any>;
};

export default function withForm<P>(
  WrappedComponent: React.ComponentType<P & FormProps>,
  { contribution, schema, initialValues = {} }: Config
) {
  return function ComponentWithForm(props: P & PassedProps) {
    const { repo, className = "" } = props;
    const path = usePathname();
    const [prUrl, setPrUrl] = useState<string | null>(null);

    let authorization = "anon";
    if (props.user) {
      authorization = "github";
    } else if (config.authorization.includes("captcha")) {
      authorization = "captcha";
    }
    const validation = Yup.object({ ...schema, ...commonSchema });
    const initial = { ...initialValues, authorization, repo, contribution };

    return (
      <Formik
        validateOnMount
        validationSchema={validation}
        initialValues={initial}
        onSubmit={async (data: any) => {
          if (confirm("Are you sure you want to submit the form?")) {
            try {
              const res = await fetch(`${path}/submit`, {
                method: "POST",
                body: JSON.stringify(data),
              });
              const json = await res.json();
              if (!res.ok) {
                throw new Error(json.error);
              }
              setPrUrl(json.prUrl);
            } catch (error) {
              let message = "Unknown Error";
              if (error instanceof Error) message = `Error: ${error.message}`;
              // TODO show in UI
              alert(message);
            }
          }
        }}
      >
        {(formik) => (
          <form
            onSubmit={formik.handleSubmit}
            className={`text-center ${className}`}
          >
            {prUrl && <Submitted prUrl={prUrl} />}
            {!prUrl && (
              <>
                <WrappedComponent {...props} formik={formik} />
                <GenericOptions {...props} formik={formik} />
                <SubmitButton formik={formik} />
              </>
            )}
            {/* <pre className="text-left">{JSON.stringify(formik, null, 2)}</pre> */}
          </form>
        )}
      </Formik>
    );
  };
}
