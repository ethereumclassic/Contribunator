import { HiExclamation, HiX } from "react-icons/hi";
import { ImSpinner2 } from "react-icons/im";

import type { UploadProgress as Progress } from "@/lib/upload/uploader";
import { formatBytes } from "@/lib/media/media";

export default function UploadProgress({
  name,
  progress,
  onCancel,
}: {
  name: string;
  progress?: Progress;
  onCancel: () => void;
}) {
  const percent = progress?.percent || 0;
  const retrying = progress?.state === "retrying";
  const status =
    progress?.state === "finishing"
      ? "Finishing…"
      : progress?.state === "starting"
      ? "Starting…"
      : `${percent.toFixed(0)}%`;
  return (
    <div
      className="bg-base-100 rounded-md border border-base-300 p-4 space-y-2 text-left"
      data-upload-state={progress?.state || "starting"}
    >
      <div className="flex items-center gap-2 text-sm">
        {retrying ? (
          <HiExclamation className="text-warning shrink-0" />
        ) : (
          <ImSpinner2 className="animate-spin opacity-60 shrink-0" />
        )}
        <span className="font-bold truncate flex-1">{name}</span>
        <span className="opacity-60 whitespace-nowrap">{status}</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          title="Cancel upload"
          onClick={onCancel}
        >
          <HiX /> Cancel
        </button>
      </div>
      <progress
        className={`progress w-full ${
          retrying ? "progress-warning" : "progress-primary"
        }`}
        value={percent}
        max={100}
      />
      <div className="text-xs opacity-60">
        {retrying && progress?.message ? (
          <span className="text-warning opacity-100">{progress.message}</span>
        ) : progress ? (
          `${formatBytes(progress.loaded)} of ${formatBytes(progress.total)}`
        ) : (
          " "
        )}
      </div>
    </div>
  );
}
