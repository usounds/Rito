import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from '@/logic/HandleOauthClientNode'
import { getAtPassport } from "@/logic/HandleAtPassport";

function getRedirectUrl(returnTo = "/") {
  const publicUrl = process.env.NEXT_PUBLIC_URL;

  if (!publicUrl) {
    throw new Error("NEXT_PUBLIC_URL is required for AtPassport callbacks");
  }

  const baseUrl = new URL(publicUrl);
  const redirectUrl = new URL(returnTo, baseUrl);

  return redirectUrl.origin === baseUrl.origin ? redirectUrl : baseUrl;
}

export async function GET(req: NextRequest) {
  const atpstateCookie = req.cookies.get("atpstate");
  const expectedAtpState = atpstateCookie?.value;

  console.log('AtPassport Callback - Cookie atpstate:', expectedAtpState ? `Found (len: ${expectedAtpState.length})` : 'Not Found');

  const atp = getAtPassport();

  try {
    // parseCallback により、パラメータの抽出と atpstate の照合を同時に行う
    // expectedAtpState が undefined の場合、ライブラリの仕様によっては検証をスキップして続行してしまう可能性があるため、
    // 明示的にチェックを行う
    const { handle, customParams } = atp.parseCallback(req.url, expectedAtpState);
    const returnTo = customParams.returnTo || "/";

    if (!handle) {
      return NextResponse.redirect(getRedirectUrl(returnTo));
    }

    const client = await getOAuthClient();

    // PDS への認可 URL を生成
    const authUrl = await client.authorize(handle);

    const response = NextResponse.redirect(authUrl);

    // 検証済みなので atpstate クッキーを削除
    response.cookies.delete("atpstate");

    // REDIRECT_TO を再設定（あれば）
    if (returnTo) {
      response.cookies.set("REDIRECT_TO", returnTo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 5,
      });
    }

    return response;

  } catch (err) {
    console.error("AtPassport callback processing failed:", err);

    // エラー時も可能な限り returnTo を特定してリダイレクトを試みる
    let fallbackUrl = "/";
    try {
      const atp = getAtPassport();
      // 解析だけ試みる（検証は失敗しているはずなので第二引数は undefined 等でよい）
      const { customParams } = atp.parseCallback(req.url);
      if (customParams.returnTo) {
        fallbackUrl = customParams.returnTo;
      }
    } catch {
      // パースすら失敗した場合はデフォルトの / へ
    }

    return NextResponse.redirect(getRedirectUrl(fallbackUrl));
  }
}
