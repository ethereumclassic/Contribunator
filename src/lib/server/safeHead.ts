import https from "https";
import dns from "dns";
import net from "net";

// Look up what a user supplied link points to (type and size) without
// letting the link reach anything private: https only, every address the
// host resolves to must be public (checked at connect time, so DNS
// rebinding can't switch it), and redirects are re-checked hop by hop.
// Never downloads the body.

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

export type HeadResult = { contentType?: string; size?: number; url: string };

export function isPrivateAddress(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast, reserved, broadcast
    );
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    // IPv4 inside IPv6: mapped (::ffff:a.b.c.d), compatible (::a.b.c.d) and
    // NAT64 (64:ff9b::a.b.c.d), in dotted or hex form (URL uses ::ffff:c0a8:101)
    const embedded = lower.match(
      /^(?:::ffff:|::|64:ff9b::)(?:(\d+\.\d+\.\d+\.\d+)|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/
    );
    if (embedded) {
      if (embedded[1]) return isPrivateAddress(embedded[1]);
      const hi = parseInt(embedded[2], 16);
      const lo = parseInt(embedded[3], 16);
      return isPrivateAddress([hi >> 8, hi & 255, lo >> 8, lo & 255].join("."));
    }
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") || // unique local
      /^fe[89ab]/.test(lower) || // link local
      lower.startsWith("ff") // multicast
    );
  }
  return true;
}

// dns.lookup replacement used by the socket: refuses private addresses
const guardedLookup: typeof dns.lookup = ((
  hostname: string,
  options: any,
  callback: any
) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses: any) => {
    if (err) return callback(err);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (bad || !list.length) {
      return callback(
        Object.assign(new Error(`Refusing to connect to ${hostname}`), {
          code: "EPRIVATE",
        })
      );
    }
    if (options?.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}) as any;

function request(
  url: URL,
  method: "HEAD" | "GET"
): Promise<{ status: number; headers: Record<string, any> }> {
  return new Promise((resolve, reject) => {
    if (url.protocol !== "https:") {
      return reject(new Error("Only https:// links are allowed"));
    }
    if (net.isIP(url.hostname.replace(/^\[|\]$/g, ""))) {
      const ip = url.hostname.replace(/^\[|\]$/g, "");
      if (isPrivateAddress(ip)) {
        return reject(new Error(`Refusing to connect to ${url.hostname}`));
      }
    }
    const req = https.request(
      url,
      {
        method,
        lookup: guardedLookup,
        timeout: TIMEOUT_MS,
        headers: {
          "user-agent": "contribunator",
          // for servers that don't support HEAD
          ...(method === "GET" && { range: "bytes=0-0" }),
        },
      },
      (res) => {
        res.resume(); // never read the body
        resolve({ status: res.statusCode || 0, headers: res.headers });
        req.destroy();
      }
    );
    req.on("timeout", () => req.destroy(new Error("Timed out")));
    req.on("error", reject);
    req.end();
  });
}

export default async function safeHead(link: string): Promise<HeadResult> {
  let url = new URL(link);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res = await request(url, "HEAD");
    if (res.status === 405 || res.status === 501) {
      res = await request(url, "GET");
    }
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      url = new URL(res.headers.location, url);
      continue;
    }
    if (res.status === 404 || res.status === 410) {
      throw new Error("The link points to nothing (not found)");
    }
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`The link returned status ${res.status}`);
    }
    // a ranged GET answers 206 with the full size in content-range
    const range = String(res.headers["content-range"] || "");
    const total = range.match(/\/(\d+)$/)?.[1];
    const length = res.status === 206 ? total : res.headers["content-length"];
    return {
      url: url.toString(),
      contentType: res.headers["content-type"],
      size: length ? Number(length) : undefined,
    };
  }
  throw new Error("Too many redirects");
}
