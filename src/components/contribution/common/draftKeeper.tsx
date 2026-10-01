import { useEffect, useRef, useState } from "react";
import { HiInformationCircle } from "react-icons/hi";

import { useForm } from "@/components/contribution/formContext";
import { idb } from "@/lib/upload/idb";

// Keeps an unsent form in the browser, so a reload or a closed tab doesn't
// lose it; together with resumable uploads this lets a long video upload
// continue where it stopped. Cleared when the pull request is created.

const SAVE_DELAY_MS = 500;
// never stored: auth state, and anything mid-upload / mid-crop
const SKIP = ["captcha", "authorization", "repo", "contribution"];

type Draft = { values: Record<string, unknown>; saved: number };

function clean(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(clean).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === "object") {
    if ("pending" in value || "editing" in value) return undefined;
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, clean(v)])
    );
  }
  return value;
}

export default function DraftKeeper({ submitted }: { submitted: boolean }) {
  const { formik, config } = useForm();
  const key = `${config.repo.name}/${config.contribution.name}`;
  const [restored, setRestored] = useState<number>();
  const loaded = useRef(false);

  // restore once
  useEffect(() => {
    idb.get<Draft>("drafts", key).then((draft) => {
      loaded.current = true;
      if (!draft || !Object.keys(draft.values).length) return;
      formik.setValues({ ...formik.values, ...draft.values }, true);
      setRestored(draft.saved);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save while typing
  const json = JSON.stringify(formik.values);
  useEffect(() => {
    if (!loaded.current || submitted) return;
    const timer = setTimeout(() => {
      const values = Object.fromEntries(
        Object.entries(formik.values)
          .filter(([k]) => !SKIP.includes(k))
          .map(([k, v]) => [k, clean(v)])
          .filter(([, v]) => v !== undefined && v !== "")
      );
      if (Object.keys(values).length) {
        idb.set("drafts", key, { values, saved: Date.now() });
      } else {
        idb.del("drafts", key);
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, submitted]);

  useEffect(() => {
    if (submitted) idb.del("drafts", key);
  }, [submitted, key]);

  if (!restored || submitted) return null;
  return (
    <div className="alert bg-base-100 border-base-300 text-sm text-left py-2">
      <HiInformationCircle className="text-info shrink-0" />
      <span className="flex-1">
        Restored your unsent draft from {new Date(restored).toLocaleString()}.
      </span>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        onClick={() => {
          idb.del("drafts", key);
          formik.resetForm();
          setRestored(undefined);
        }}
      >
        Start over
      </button>
    </div>
  );
}
