import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const NAS_SECRET = process.env.NAS_SECRET;
const COOKIE_NAME = "nas_session";
const COOKIE_PASSWORD = process.env.NAS_PASSWORD;

function getSession(request: NextRequest): boolean {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookie || !COOKIE_PASSWORD) return false;
  return cookie === COOKIE_PASSWORD;
}

export async function POST(request: NextRequest) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const baseUrl = await kv.get<string>("nas_tunnel_url");
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NAS offline" },
      { status: 503 }
    );
  }
  const path = request.nextUrl.searchParams.get("path") || "";
  const formData = await request.formData();
  const url = `${baseUrl.replace(/\/$/, "")}/api/upload${path ? `?path=${encodeURIComponent(path)}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "X-NAS-Secret": NAS_SECRET || "" },
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json(
      { error: "NAS unreachable", details: String(e) },
      { status: 502 }
    );
  }
}
