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
