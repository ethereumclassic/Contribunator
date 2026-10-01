import {
  completeMultipartUpload,
  createMultipartUpload,
  put,
  uploadPart,
} from "@vercel/blob/client";

import { idb } from "./idb";

// Resumable uploads from the browser straight to the Vercel Blob store.
//
// Small files are a single request. Larger files are a multipart upload of
// PART_SIZE parts, a few in parallel; every finished part is saved in
// IndexedDB, so after a dropped connection, a closed tab or a reload,
// picking the same file again uploads only the missing parts. The SDK
// already retries single requests; parts are retried again on top of that,
// with a growing pause, before the upload is reported as failed.

export const PART_SIZE = 8 * 1024 * 1024; // the store's minimum is 5MB
const CONCURRENCY = 3;
const PART_ATTEMPTS = 5;

export type UploadTarget = {
  repo: string;
  contribution: string;
  field: string;
};

export type UploadProgress = {
  loaded: number;
  total: number;
  /** 0 - 100 */
  percent: number;
  state: "starting" | "uploading" | "retrying" | "finishing";
  /** set while retrying */
  message?: string;
};

export type UploadResult = {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
};

type Part = { etag: string; partNumber: number };

export type ResumeRecord = {
  pathname: string;
  name: string;
  size: number;
  contentType: string;
  uploadId?: string;
  key?: string;
  parts: Part[];
  updated: number;
};

export class UploadError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export function resumeKey(target: UploadTarget, file: File | ResumeRecord) {
  const modified = file instanceof File ? file.lastModified : 0;
  return `${target.repo}/${target.contribution}/${target.field}/${file.name}/${file.size}/${modified}`;
}

/** unfinished uploads for a field, newest first, to offer resuming them */
export async function pendingUploads(target: UploadTarget) {
  const prefix = `${target.repo}/${target.contribution}/${target.field}/`;
  const records = await idb.all<ResumeRecord>("uploads");
  return records
    .filter(({ key }) => key.startsWith(prefix))
    .map(({ key, value }) => ({ key, ...value }))
    .sort((a, b) => b.updated - a.updated);
}

export function forgetUpload(key: string) {
  return idb.del("uploads", key);
}

export function uploadedBytes(record: ResumeRecord) {
  return Math.min(record.parts.length * PART_SIZE, record.size);
}

async function requestToken(
  target: UploadTarget,
  file: File,
  pathname?: string
): Promise<{ token: string; pathname: string; url: string }> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "token",
      ...target,
      name: file.name,
      size: file.size,
      contentType: file.type,
      pathname,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(json.error || "Upload failed", res.status);
  return json;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

const isAbort = (e: unknown) =>
  (e instanceof DOMException && e.name === "AbortError") ||
  (e instanceof Error && /aborted/i.test(e.message));
const isExpired = (e: unknown) =>
  e instanceof Error && /token has expired/i.test(e.message);
const isGone = (e: unknown) =>
  e instanceof Error &&
  /does not exist|not found|no such upload/i.test(e.message);

export async function uploadFile({
  file,
  target,
  onProgress,
  signal,
  // called when the server says the upload session is missing or expired;
  // should start a new one (may show the captcha) and resolve when done
  renewSession,
}: {
  file: File;
  target: UploadTarget;
  onProgress: (p: UploadProgress) => void;
  signal?: AbortSignal;
  renewSession: () => Promise<void>;
}): Promise<UploadResult> {
  const key = resumeKey(target, file);
  let record = await idb.get<ResumeRecord>("uploads", key);
  const total = file.size;
  const report = (
    loaded: number,
    state: UploadProgress["state"],
    message?: string
  ) =>
    onProgress({
      loaded,
      total,
      percent: total
        ? Math.min(100, Math.round((loaded / total) * 1000) / 10)
        : 0,
      state,
      message,
    });

  let token = "";
  let url = "";
  const refreshToken = async () => {
    let issued;
    try {
      issued = await requestToken(target, file, record?.pathname);
    } catch (e) {
      if (!(e instanceof UploadError)) throw e;
      if (e.status === 403 && record) {
        // the session that started this upload is gone: start over
        await forgetUpload(key);
        record = undefined;
        issued = await requestToken(target, file);
      } else if (e.status === 401) {
        await renewSession();
        issued = await requestToken(target, file, record?.pathname);
      } else {
        throw e;
      }
    }
    token = issued.token;
    url = issued.url;
    if (!record) {
      record = {
        pathname: issued.pathname,
        name: file.name,
        size: file.size,
        contentType: file.type,
        parts: [],
        updated: Date.now(),
      };
    }
  };

  report(record ? uploadedBytes(record) : 0, "starting");
  await refreshToken();
  const pathname = record!.pathname;
  const common = { access: "public" as const, contentType: file.type };

  // small files: one request
  if (total <= PART_SIZE) {
    try {
      const blob = await withRetries(
        () =>
          put(pathname, file, {
            ...common,
            token,
            abortSignal: signal,
            onUploadProgress: ({ loaded }) => report(loaded, "uploading"),
          }),
        { signal, onRetry: (m) => report(0, "retrying", m), refreshToken }
      );
      url = blob.url;
    } catch (e) {
      // an earlier attempt went through but its response was lost
      if (!(e instanceof Error && /already exists/i.test(e.message))) throw e;
    }
    report(total, "finishing");
    return { url, pathname, contentType: file.type, size: total };
  }

  // large files: resumable multipart upload
  const saveRecord = () => {
    record!.updated = Date.now();
    return idb.set("uploads", key, record);
  };
  if (!record!.uploadId) {
    const created = await withRetries(
      () =>
        createMultipartUpload(pathname, {
          ...common,
          token,
          abortSignal: signal,
        }),
      { signal, onRetry: (m) => report(0, "retrying", m), refreshToken }
    );
    record!.uploadId = created.uploadId;
    record!.key = created.key;
    record!.parts = [];
    await saveRecord();
  }

  const count = Math.ceil(total / PART_SIZE);
  const done = new Set(record!.parts.map((p) => p.partNumber));
  const inFlight = new Map<number, number>();
  const doneBytes = () =>
    record!.parts.reduce(
      (sum, p) =>
        sum + Math.min(PART_SIZE, total - (p.partNumber - 1) * PART_SIZE),
      0
    );
  const progress = (
    state: UploadProgress["state"] = "uploading",
    message?: string
  ) =>
    report(
      doneBytes() + Array.from(inFlight.values()).reduce((a, b) => a + b, 0),
      state,
      message
    );
  progress();

  const queue = Array.from({ length: count }, (_, i) => i + 1).filter(
    (n) => !done.has(n)
  );
  const worker = async () => {
    while (queue.length) {
      const partNumber = queue.shift()!;
      const start = (partNumber - 1) * PART_SIZE;
      const body = file.slice(start, Math.min(start + PART_SIZE, total));
      const part = await withRetries(
        () =>
          uploadPart(pathname, body, {
            ...common,
            token,
            uploadId: record!.uploadId!,
            key: record!.key!,
            partNumber,
            abortSignal: signal,
            onUploadProgress: ({ loaded }) => {
              inFlight.set(partNumber, loaded);
              progress();
            },
          }),
        {
          signal,
          onRetry: (m) => {
            inFlight.delete(partNumber);
            progress("retrying", m);
          },
          refreshToken,
        }
      );
      inFlight.delete(partNumber);
      record!.parts.push({ etag: part.etag, partNumber });
      await saveRecord();
      progress();
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker)
    );
  } catch (e) {
    // the store no longer knows this upload (expired): start over once
    if (isGone(e) && record!.parts.length) {
      await forgetUpload(key);
      return uploadFile({ file, target, onProgress, signal, renewSession });
    }
    throw e;
  }

  report(total, "finishing");
  const parts = [...record!.parts].sort((a, b) => a.partNumber - b.partNumber);
  const blob = await withRetries(
    () =>
      completeMultipartUpload(pathname, parts, {
        ...common,
        token,
        uploadId: record!.uploadId!,
        key: record!.key!,
        abortSignal: signal,
      }),
    { signal, onRetry: (m) => report(total, "retrying", m), refreshToken }
  );
  await forgetUpload(key);
  return { url: blob.url, pathname, contentType: file.type, size: total };
}

async function withRetries<T>(
  fn: () => Promise<T>,
  {
    signal,
    onRetry,
    refreshToken,
  }: {
    signal?: AbortSignal;
    onRetry: (message: string) => void;
    refreshToken: () => Promise<void>;
  }
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (signal?.aborted || isAbort(e)) throw e;
      if (isExpired(e)) {
        await refreshToken();
        continue;
      }
      if (attempt >= PART_ATTEMPTS || isGone(e)) throw e;
      const wait = Math.min(30, 2 ** attempt) * 1000;
      onRetry(
        `Connection problem, retrying in ${wait / 1000}s (attempt ${
          attempt + 1
        } of ${PART_ATTEMPTS})`
      );
      await sleep(wait, signal);
    }
  }
}
