import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from "@/logic/HandleOauthClientNode";

type Body = {
  handle: string;
  returnTo?: string;
  csrf: string;
  prompt?: "none" | "login" | "consent" | "select_account" | "create";
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

  const { handle, returnTo = "/", csrf, prompt } = body;

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
  const client = await getOAuthClient();
  try {
    // prompt が指定されている場合はそれを優先、なければ none を試行
    url = await client.authorize(handle, { prompt: prompt || "none" });
  } catch (e) {
    if (prompt) {
      // prompt が指定されていてエラーになった場合は、そのままの prompt で再試行（内部的な fallback に期待）
      url = await client.authorize(handle, { prompt: prompt });
    } else {
      // prompt なしでエラーになった場合は通常の認可画面へ
      url = await client.authorize(handle);
    }
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
