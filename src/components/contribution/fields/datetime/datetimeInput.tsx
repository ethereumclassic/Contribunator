import { useField } from "formik";
import { useMemo, useState } from "react";
import { HiX } from "react-icons/hi";

import type { Dynamic, UnwrapDynamic } from "@/types";

import FieldHeader from "@/components/contribution/common/fieldHeader";
import {
  SCHEDULE_ZONES,
  browserTimeZone,
  summarizeSchedule,
  utcToWall,
  wallToUtc,
} from "@/lib/contribution/tweet/tweetSchedule";

import withDynamicField from "../withDynamicField";

export type Props = {
  title?: Dynamic<string>;
  name: string;
  info?: Dynamic<string>;
};

const dynamicProps = ["title", "info"] as const;

// A date-time picker with a time zone selector. The user types a time in
// their own zone (default) or another zone; the form value is always the
// equivalent UTC wall time, which is what the rest of the pipeline expects.
function DatetimeInput({
  title,
  name,
  info,
}: UnwrapDynamic<Props, (typeof dynamicProps)[number]>) {
  const [field, meta, helpers] = useField<string | undefined>(name);

  const local = useMemo(() => browserTimeZone(), []);
  const zones = useMemo(
    () => [
      { id: local, label: `Your time zone (${local})` },
      ...SCHEDULE_ZONES.filter((z) => z.timeZone !== local).map((z) => ({
        id: z.timeZone,
        label: z.short,
      })),
    ],
    [local]
  );

  const [tz, setTz] = useState(local);
  const [wall, setWall] = useState(() => utcToWall(field.value, local));

  const update = (nextWall: string, nextTz: string) => {
    setWall(nextWall);
    setTz(nextTz);
    const value = nextWall ? wallToUtc(nextWall, nextTz) : "";
    helpers.setValue(value || undefined);
  };

  const summary =
    field.value && !meta.error ? summarizeSchedule(field.value) : info;

  return (
    <div className="form-control">
      <FieldHeader
        name={name}
        error={meta.error}
        title={title}
        info={summary}
      />
      <div className="flex gap-2">
        <input
          id={name}
          type="datetime-local"
          className="input input-bordered flex-auto min-w-0"
          value={wall}
          onChange={(e) => update(e.target.value, tz)}
          onBlur={() => helpers.setTouched(true)}
        />
        <select
          aria-label="Time zone"
          className="select select-bordered max-w-[45%]"
          value={tz}
          onChange={(e) => update(wall, e.target.value)}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
        {wall && (
          <div
            title="Clear Field"
            className="btn btn-error"
            onClick={() => update("", tz)}
          >
            <HiX />
          </div>
        )}
      </div>
    </div>
  );
}

export default withDynamicField(DatetimeInput, dynamicProps);
