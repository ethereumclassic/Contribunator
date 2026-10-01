// Minimal promise wrapper around one IndexedDB object store, used to keep
// upload progress and form drafts across page reloads. Every call fails soft
// (resolves undefined) when IndexedDB is unavailable, e.g. private windows.

const DB_NAME = "contribunator";
const DB_VERSION = 1;
export const STORES = ["uploads", "drafts"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase | undefined> | undefined;

function open(): Promise<IDBDatabase | undefined> {
  if (typeof indexedDB === "undefined") return Promise.resolve(undefined);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        STORES.forEach((name) => {
          if (!req.result.objectStoreNames.contains(name)) {
            req.result.createObjectStore(name);
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
      req.onblocked = () => resolve(undefined);
    });
  }
  return dbPromise;
}

async function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest
): Promise<T | undefined> {
  const db = await open();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(store, mode).objectStore(store));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export const idb = {
  get: <T>(store: StoreName, key: string) =>
    run<T>(store, "readonly", (s) => s.get(key)),
  set: (store: StoreName, key: string, value: unknown) =>
    run(store, "readwrite", (s) => s.put(value, key)),
  del: (store: StoreName, key: string) =>
    run(store, "readwrite", (s) => s.delete(key)),
  all: async <T>(store: StoreName) => {
    const keys =
      (await run<string[]>(store, "readonly", (s) => s.getAllKeys())) || [];
    const values = (await run<T[]>(store, "readonly", (s) => s.getAll())) || [];
    return keys.map((key, i) => ({ key, value: values[i] }));
  },
};
