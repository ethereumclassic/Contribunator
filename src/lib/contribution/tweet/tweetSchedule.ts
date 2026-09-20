// The schedule field is a `datetime-local` input interpreted as UTC, e.g.
// "2030-01-02T03:04". It is stored as typed and converted to ISO 8601 when
// the pull request is created.

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

export function describeSchedule(value?: string | null): string {
  const date = scheduleToDate(value);
  if (!date) {
    return "Optional, publishes later";
  }
  const local = date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `Local: ${local}`;
}

// Human readable schedule for the pull request description, e.g.
//
//   🗓 Scheduled for Monday 21 September 2026
//
//   🌐 07:00 UTC
//   🇺🇸 03:00 Eastern
//   🇨🇳 15:00 China Standard Time
//
// A zone whose calendar date differs from the UTC date gets it appended.
const ZONES: { flag: string; label: string; timeZone: string }[] = [
  { flag: "🌐", label: "UTC", timeZone: "UTC" },
  { flag: "🇺🇸", label: "Eastern", timeZone: "America/New_York" },
  { flag: "🇨🇳", label: "China Standard Time", timeZone: "Asia/Shanghai" },
];

function fmt(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone }).format(date);
}

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
  const time = (tz: string) =>
    fmt(date, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  const utcDay = longDate("UTC");
  const lines = ZONES.map(({ flag, label, timeZone }) => {
    const sameDay = longDate(timeZone) === utcDay;
    return `${flag} ${time(timeZone)} ${label}${
      sameDay ? "" : ` (${shortDate(timeZone)})`
    }`;
  });

  return [
    `🗓 Scheduled for ${utcDay}`,
    "",
    ...lines,
    "",
    "Merging this Pull Request queues the tweet. It publishes automatically at that time, not on merge.",
  ].join("\n");
}
