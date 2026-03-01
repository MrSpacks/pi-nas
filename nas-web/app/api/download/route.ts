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

export async function GET(request: NextRequest) {
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
  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path required" }, { status: 400 });
  }
  const url = `${baseUrl.replace(/\/$/, "")}/api/download?path=${encodeURIComponent(path)}`;
  try {
    const res = await fetch(url, {
      headers: { "X-NAS-Secret": NAS_SECRET || "" },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Download failed" },
        { status: res.status }
      );
    }
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const disposition = res.headers.get("content-disposition");
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(disposition ? { "Content-Disposition": disposition } : {}),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "NAS unreachable", details: String(e) },
      { status: 502 }
    );
  }
}
