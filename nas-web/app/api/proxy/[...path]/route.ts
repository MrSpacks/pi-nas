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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const baseUrl = await kv.get<string>("nas_tunnel_url");
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NAS offline (tunnel not registered)" },
      { status: 503 }
    );
  }
  const path = (await params).path?.join("/") || "";
  const query = request.nextUrl.searchParams.toString();
  const url = `${baseUrl.replace(/\/$/, "")}/api/${path}${query ? `?${query}` : ""}`;
  try {
    const res = await fetch(url, {
      headers: { "X-NAS-Secret": NAS_SECRET || "" },
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { error: "No response" }, {
      status: res.status,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "NAS unreachable", details: String(e) },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (!getSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const baseUrl = await kv.get<string>("nas_tunnel_url");
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NAS offline (tunnel not registered)" },
      { status: 503 }
    );
  }
  const path = (await params).path?.join("/") || "";
  const query = request.nextUrl.searchParams.toString();
  const url = `${baseUrl.replace(/\/$/, "")}/api/${path}${query ? `?${query}` : ""}`;
  try {
    const body = await request.text();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-NAS-Secret": NAS_SECRET || "",
        "Content-Type": request.headers.get("content-type") || "application/json",
      },
      body: body || undefined,
    });
    const data = await res.json().catch(() => null);
    return NextResponse.json(data ?? { error: "No response" }, {
      status: res.status,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "NAS unreachable", details: String(e) },
      { status: 502 }
    );
  }
}
