import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const token = crypto.randomBytes(32).toString("hex");

  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set("CSRF_TOKEN", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 5, // 5分
  });

  return res;
}