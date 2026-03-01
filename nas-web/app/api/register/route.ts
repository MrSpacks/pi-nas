import { kv } from "@vercel/kv";
import { NextRequest, NextResponse } from "next/server";

const REGISTER_SECRET = process.env.NAS_REGISTER_SECRET;

export async function POST(request: NextRequest) {
  if (!REGISTER_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  try {
    const body = await request.json();
    const { url, secret } = body || {};
    if (secret !== REGISTER_SECRET || typeof url !== "string" || !url.startsWith("https://")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await kv.set("nas_tunnel_url", url.trim());
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
