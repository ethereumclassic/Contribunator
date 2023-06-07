import TextInput from "./textInput";
import { BaseFormProps } from "./withFormik";

export default function GenericOptions({ formik, config }: BaseFormProps) {
  const { title, message } = config.contribution.prMetadata(formik.values);
  return (
    <>
      <div className="">
        <div className="collapse collapse-arrow rounded-md bg-base-100 bg-opacity-50">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-left text-sm flex items-center peer-checked:font-bold">
            Advanced Options
          </div>
          <div className="collapse-content space-y-6 -mx-1">
            <TextInput
              title="Custom Pull Request Title"
              info="Special characters will be removed"
              name="customTitle"
              placeholder={title}
            />
            <TextInput
              title="Custom Pull Request Message"
              name="customMessage"
              placeholder={message}
              as="textarea"
            />
          </div>
        </div>
      </div>
    </>
  );
}
