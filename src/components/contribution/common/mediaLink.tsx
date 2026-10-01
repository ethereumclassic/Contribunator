import { useState } from "react";
import { HiLink, HiUpload } from "react-icons/hi";

import type { UploadTarget } from "@/lib/upload/uploader";
import { MediaItem, RemoteUrlOption, checkRemoteUrl } from "@/lib/media/media";

/** "Upload | Link" switch, styled like the choice buttons */
export function UploadOrLink({
  mode,
  setMode,
}: {
  mode: "upload" | "link";
  setMode: (mode: "upload" | "link") => void;
}) {
  const style = (active: boolean) =>
    `flex-1 btn ${active ? "btn-neutral" : "btn-ghost bg-base-100"}`;
  return (
    <div className="btn-group flex rounded-lg textarea textarea-bordered p-0">
      <a className={style(mode === "upload")} onClick={() => setMode("upload")}>
        <HiUpload /> Upload
      </a>
      <a className={style(mode === "link")} onClick={() => setMode("link")}>
        <HiLink /> Link
      </a>
    </div>
  );
}

/** a link to a file elsewhere, checked by the server before it is added */
export function MediaLinkInput({
  target,
  remoteUrl,
  label,
  onAdd,
}: {
  target: UploadTarget;
  remoteUrl: RemoteUrlOption;
  label: string;
  onAdd: (item: MediaItem) => void;
}) {
  const [link, setLink] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string>();

  async function add() {
    setError(undefined);
    const url = link.trim();
    const invalid = checkRemoteUrl(url, remoteUrl);
    if (invalid) return setError(invalid);
    setChecking(true);
    try {
      const res = await fetch("/api/media/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...target, url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not check the link");
      onAdd({ ...json, source: "remote" });
      setLink("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check the link");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="url"
          className="input input-bordered w-full"
          placeholder="https://"
          aria-label={`${label} link`}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          className="btn btn-neutral"
          disabled={checking || !link.trim()}
          onClick={add}
        >
          {checking ? "Checking…" : "Add"}
        </button>
      </div>
      {error && (
        <div className="text-error text-sm text-left" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

/** the captcha, shown inside a field when an upload needs it */
export function UploadCaptchaPrompt({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-base-100 rounded-md p-4 space-y-2">
      <div className="text-sm">
        Please complete the CAPTCHA to start uploading. It also covers
        submitting this form.
      </div>
      {children}
    </div>
  );
}
