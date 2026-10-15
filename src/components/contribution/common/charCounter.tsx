import { HiBadgeCheck } from "react-icons/hi";

export type CounterInfo = {
  /** characters used, as the platform counts them */
  count: number;
  /** the usual limit, always shown */
  limit: number;
  /** a higher limit the account may use (e.g. X Premium), if any */
  max?: number;
  /** names the higher limit, e.g. "Premium" */
  maxLabel?: string;
};

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * A bar against the usual limit, the characters left, and when the account
 * may go further, how far and what that means.
 */
export default function CharCounter({
  count,
  limit,
  max,
  maxLabel = "Premium",
}: CounterInfo) {
  const extended = !!max && max > limit;
  const over = count > limit;
  const tooLong = count > (extended ? max! : limit);
  const state = tooLong
    ? "too-long"
    : over
    ? "long"
    : count > limit * 0.9
    ? "near"
    : "ok";

  const color = {
    ok: "progress-primary",
    near: "progress-warning",
    long: "progress-warning",
    "too-long": "progress-error",
  }[state];
  const textColor = {
    ok: "opacity-60",
    near: "text-warning",
    long: "text-warning",
    "too-long": "text-error",
  }[state];

  const status = tooLong
    ? `${fmt(count - (extended ? max! : limit))} over the ${fmt(
        extended ? max! : limit
      )} limit`
    : over
    ? `${fmt(count)} characters, ${fmt(count - limit)} over ${fmt(limit)}`
    : `${fmt(limit - count)} of ${fmt(limit)} left`;

  return (
    <div
      className="space-y-1 text-xs text-left"
      data-char-count={count}
      data-char-state={state}
    >
      <progress
        className={`progress ${color} w-full h-1.5 block`}
        value={Math.min(count, limit)}
        max={limit}
        aria-label={`${fmt(count)} of ${fmt(limit)} characters`}
      />
      <div className="flex items-center gap-2 flex-wrap">
        {extended && (
          <span
            className="badge badge-sm badge-info gap-1"
            title={`This account can post up to ${fmt(max!)} characters`}
          >
            <HiBadgeCheck />
            {maxLabel}
          </span>
        )}
        <span className={`flex-1 ${textColor}`}>
          {over && !tooLong && <b>Long post: </b>}
          {status}
        </span>
        {extended && !over && (
          <span className="opacity-60">up to {fmt(max!)}</span>
        )}
      </div>
      {over && !tooLong && (
        <div className="opacity-60">
          Timelines show about the first {fmt(limit)} characters, followed by
          &ldquo;Show more&rdquo;. Keep it short unless the post needs the room.
        </div>
      )}
    </div>
  );
}
