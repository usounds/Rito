import { NextRequest, NextResponse } from "next/server";
import { client } from "@/logic/HandleOauthClientNode";

export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer");

  // Referer が存在して、自サイトのURLで始まらない場合は403
  if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const handle = req.nextUrl.searchParams.get("handle") || "";
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/";

  if (!returnTo.startsWith("/") && !returnTo.startsWith(process.env.NEXT_PUBLIC_URL!)) {
    return new NextResponse("Invalid Return To", { status: 403 });
  }

  // PKCE code_verifier と state を生成

  // /oauth/authorize へ直接リダイレクト
  const url = await client.authorize(handle, {
    prompt: 'none',
  })

  // レスポンス作成
  const response = NextResponse.redirect(url);

  // returnTo をクッキーに保存（HTTP Only & Secure）
  response.cookies.set("REDIRECT_TO", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/", // 全ページで参照可能
    maxAge: 60 * 5, // 5分で期限切れ
  });
  response.cookies.set("HANDLE", handle, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/", // 全ページで参照可能
    maxAge: 60 * 5, // 5分で期限切れ
  });


  return response;
}
