import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// The schedule is stored in the form as a UTC wall time, "2030-01-02T03:04".
// The picker lets the user type it in their own time zone (or UTC) and
// converts; the pull request and tweet file get ISO 8601.

export function scheduleToDate(value?: string | null): Date | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const date = new Date(/(Z|[+-]\d\d:?\d\d)$/.test(raw) ? raw : `${raw}Z`);
  return isNaN(date.getTime()) ? null : date;
}

export function scheduleToIso(value?: string | null): string | null {
  const date = scheduleToDate(value);
  return date ? date.toISOString() : null;
}

export const SCHEDULE_ZONES: {
  flag: string;
  label: string;
  short: string;
  timeZone: string;
}[] = [
  { flag: "🌐", label: "UTC", short: "UTC", timeZone: "UTC" },
  {
    flag: "🇺🇸",
    label: "Eastern",
    short: "US Eastern",
    timeZone: "America/New_York",
  },
  {
    flag: "🇨🇳",
    label: "China Standard Time",
    short: "China",
    timeZone: "Asia/Shanghai",
  },
];

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (err) {
    return "UTC";
  }
}

// "2030-01-02T03:04" typed in `tz` -> the same instant as a UTC wall time
export function wallToUtc(wall: string, tz: string): string {
  const d = tz === "UTC" ? dayjs.utc(wall) : dayjs.tz(wall, tz);
  return d.isValid() ? d.utc().format("YYYY-MM-DDTHH:mm") : "";
}

// stored UTC wall time -> wall time in `tz`, for showing an existing value
export function utcToWall(value: string | undefined, tz: string): string {
  const date = scheduleToDate(value);
  return date ? dayjs(date).tz(tz).format("YYYY-MM-DDTHH:mm") : "";
}

function fmt(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone }).format(date);
}

const time = (date: Date, tz: string) =>
  fmt(date, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// one line under the picker, e.g.
//   📅 Mon 21 Sep · 🌐 07:00 UTC · 🇺🇸 03:00 US Eastern · 🇨🇳 15:00 China
export function summarizeSchedule(value: string | undefined): string {
  const date = scheduleToDate(value);
  if (!date) return "";
  const day = fmt(date, "UTC", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return [
    `📅 ${day}`,
    ...SCHEDULE_ZONES.map(
      ({ flag, short, timeZone }) => `${flag} ${time(date, timeZone)} ${short}`
    ),
  ].join(" · ");
}

// Human readable schedule for the pull request description, e.g.
//
//   📅 Scheduled for Monday, 21 September 2026
//
//   🌐 07:00 UTC
//   🇺🇸 03:00 Eastern
//   🇨🇳 15:00 China Standard Time
//
// A zone whose calendar date differs from the UTC date gets it appended.
export function describeScheduleForPr(iso: string): string {
  const date = new Date(iso);
  const longDate = (tz: string) =>
    fmt(date, tz, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const shortDate = (tz: string) =>
    fmt(date, tz, { weekday: "short", day: "numeric", month: "short" });

  const utcDay = longDate("UTC");
  const lines = SCHEDULE_ZONES.map(({ flag, label, timeZone }) => {
    const sameDay = longDate(timeZone) === utcDay;
    return `${flag} ${time(date, timeZone)} ${label}${
      sameDay ? "" : ` (${shortDate(timeZone)})`
    }`;
  });

  return [
    `📅 Scheduled for ${utcDay}`,
    "",
    ...lines,
    "",
    "Merging this Pull Request queues the tweet. It publishes automatically at that time, not on merge.",
  ].join("\n");
}
