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

// keep in sync with the schedule validation in tweet.loader.ts
const MIN_MINUTES = 30;
const MAX_DAYS = 365;
// the publish check runs every 30 minutes, so only those times can be picked
const STEP_MINUTES = 30;

// round up to the next :00 / :30 (UTC)
function alignUp(ms: number) {
  const step = STEP_MINUTES * 60000;
  return Math.ceil(ms / step) * step;
}

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

  // the native picker greys out anything outside [min, max], expressed in
  // the selected zone; the schema enforces the same limits on submit
  const now = Date.now();
  const min = utcToWall(
    new Date(alignUp(now + MIN_MINUTES * 60000)).toISOString(),
    tz
  );
  const max = utcToWall(
    new Date(now + MAX_DAYS * 24 * 60 * 60000).toISOString(),
    tz
  );

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
          min={min}
          max={max}
          step={STEP_MINUTES * 60}
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
      <div className="text-xs text-left opacity-60 mt-2">
        Scheduled tweets go out at the next check after the chosen time. Checks
        run every {STEP_MINUTES} minutes, on the hour and half hour, so those
        are the times you can pick.
      </div>
    </div>
  );
}

export default withDynamicField(DatetimeInput, dynamicProps);
