import { e2e } from "@/lib/env";

// Vercel Blob store settings. BLOB_READ_WRITE_TOKEN is set by Vercel when a
// Blob store is connected to the project; its store id is the subdomain of
// every public blob URL.
//
// In end-to-end tests the SDK talks to the mock in /api/e2e/blob
// (NEXT_PUBLIC_VERCEL_BLOB_API_URL) and blobs are served from there.

// all uploads go under this prefix; manifests (which uploads belong to which
// pull request) under the other
export const UPLOAD_PREFIX = "uploads/";
export const MANIFEST_PREFIX = "manifests/";

export function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Uploads need a Vercel Blob store: BLOB_READ_WRITE_TOKEN is not set"
    );
  }
  return token;
}

export function blobStoreId() {
  // vercel_blob_rw_<storeId>_<secret>
  const [, , , storeId] = blobToken().split("_");
  if (!storeId) throw new Error("BLOB_READ_WRITE_TOKEN is malformed");
  return storeId.toLowerCase();
}

/** the URL every public blob in the store starts with */
export function blobPublicBase() {
  if (e2e && process.env.E2E_BLOB_PUBLIC_BASE) {
    return process.env.E2E_BLOB_PUBLIC_BASE;
  }
  return `https://${blobStoreId()}.public.blob.vercel-storage.com/`;
}

/** the store pathname of one of our uploads, or undefined */
export function uploadPathname(url: string) {
  const base = blobPublicBase();
  if (!url.startsWith(base)) return;
  const pathname = decodeURIComponent(url.slice(base.length).split("?")[0]);
  if (!pathname.startsWith(UPLOAD_PREFIX) || pathname.includes("..")) return;
  return pathname;
}
