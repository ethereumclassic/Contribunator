import { decorateFormData } from "@/lib/helpers/decorateFormData";
import { destructureMeta } from "@/lib/helpers/destructureMeta";
import { ConfigWithContribution, FormikContext } from "@/types";
import { createContext, useContext } from "react";

export const FormContext = createContext<{
  formik: FormikContext;
  config: ConfigWithContribution;
}>({});

export function useForm() {
  const { formik, config } = useContext(FormContext);
  const { values } = formik;
  const destructured = destructureMeta(values);
  const decorated = decorateFormData({ ...destructured, config });
  return { ...decorated, formik, config };
}
