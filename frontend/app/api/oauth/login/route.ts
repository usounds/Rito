import { NextRequest, NextResponse } from "next/server";
import { client } from "@/logic/HandleOauthClientNode";

type Body = {
  handle: string;
  returnTo?: string;
  csrf: string;
};

export async function POST(req: NextRequest) {
  const referer = req.headers.get("referer");

  if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { handle, returnTo = "/", csrf } = body;

  const csrfCookie = req.cookies.get("CSRF_TOKEN")?.value;
  if (!csrf || !csrfCookie || csrf !== csrfCookie) {
    return new NextResponse("Invalid CSRF token", { status: 403 });
  }

  if (
    !returnTo.startsWith("/") &&
    !returnTo.startsWith(process.env.NEXT_PUBLIC_URL!)
  ) {
    return new NextResponse("Invalid Return To", { status: 403 });
  }

  // OAuth authorize URL を生成
  let url: URL;
  try {
    url = await client.authorize(handle, { prompt: "none" });
  } catch {
    url = await client.authorize(handle);
  }

  const response = NextResponse.json({ url: url.toString() });

  response.cookies.set("REDIRECT_TO", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5,
  });

  response.cookies.set("HANDLE", handle, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5,
  });

  // CSRF はワンタイム
  response.cookies.delete({ name: "CSRF_TOKEN", path: "/" });

  return response;
}
