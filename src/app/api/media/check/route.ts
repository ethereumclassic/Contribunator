import { NextRequest, NextResponse } from "next/server";

import getConfig from "@/lib/config";
import { mediaRules } from "@/lib/media/rules";
import checkMediaLink from "@/lib/server/checkMediaLink";

// Checks a link to a remote file for a media field: { repo, contribution,
// field, url } => { url, contentType, size, kind } or { error }.

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = await getConfig(body.repo, body.contribution);
    const rules = mediaRules(config, body.field);
    const checked = await checkMediaLink(String(body.url || ""), rules);
    return NextResponse.json(checked);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not check link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
