import { NextRequest, NextResponse } from "next/server";

import { fetchTweetFromSyndication } from "@/lib/contribution/tweet/tweetLookup";

// Server side proxy for the client side form validation, see tweetLookup.ts
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^\d{1,25}$/.test(id)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }
  try {
    const post = await fetchTweetFromSyndication(id);
    return NextResponse.json(
      { found: !!post, post },
      { headers: { "cache-control": "public, max-age=300" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
