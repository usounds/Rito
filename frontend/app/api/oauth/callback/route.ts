import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/logic/HandlePrismaClient';

const AIP_BASE = process.env.OIDC_PROVIDER!;
const CLIENT_ID = process.env.RITO_CLIENT_ID!;
const CLIENT_SECRET = process.env.RITO_CLIENT_SECRET!;

const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60;      // 1日
const REFRESH_TOKEN_MAX_AGE = 60 * 24 * 60 * 60; // 60日

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
    if (!state) return NextResponse.json({ error: "Missing state" }, { status: 400 });

    // DBからcode_verifierとredirect_uriを取得
    const oAuthState = await prisma.oAuthState.findUnique({ where: { state } });
    if (!oAuthState) return NextResponse.json({ error: "Invalid state" }, { status: 400 });

    // レコード削除
    await prisma.oAuthState.delete({ where: { state } });

    const codeVerifier = oAuthState.code_verifier;
    const redirectUri = oAuthState.redirect_uri;
    const returnTo = oAuthState.return_to;

    // OAuthトークン取得
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

    const tokenRes = await fetch(`${AIP_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return NextResponse.json(tokenData, { status: tokenRes.status });


    // トークンをクッキーに保存してリダイレクト
    const res = NextResponse.redirect(returnTo||'');
    res.cookies.set("access_token", tokenData.access_token, {
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "lax",
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });

    if (tokenData.refresh_token) {
      res.cookies.set("refresh_token", tokenData.refresh_token, {
        httpOnly: true,
        secure: true,
        path: "/",
        sameSite: "lax",
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    }

    await prisma.$disconnect();

    return res;
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.json({ error: "Internal Server Error", detail: err.message }, { status: 500 });
  }
}
