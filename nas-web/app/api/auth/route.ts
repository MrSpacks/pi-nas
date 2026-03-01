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
  const body = await request.json().catch(() => ({}));
  const password = body?.password;
  if (!password || password !== COOKIE_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: getSession(request) });
}

export async function DELETE(request: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
