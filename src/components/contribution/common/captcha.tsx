import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useField } from "formik";

import { captchaKey } from "@/lib/env";

// the uploaders scroll to it when they need it
export const CAPTCHA_ID = "captcha";

export default function Captcha() {
  const [, meta, helpers] = useField("captcha");

  return (
    <div
      id={CAPTCHA_ID}
      className="flex items-center justify-center flex-col space-y-4"
    >
      <HCaptcha
        sitekey={captchaKey}
        onVerify={(token) => {
          helpers.setValue(token);
        }}
      />
      {meta.error && <div className="text-error text-sm">{meta.error}</div>}
    </div>
  );
}
