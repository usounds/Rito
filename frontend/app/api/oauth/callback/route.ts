import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient } from '@/logic/HandleOauthClientNode'
import { prisma } from '@/logic/HandlePrismaClient'
import { Agent } from "@atproto/api";
import crypto from "crypto";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "secret";

function signDid(did: string) {
  const hmac = crypto.createHmac("sha256", COOKIE_SECRET);
  hmac.update(did);
  return `${did}.${hmac.digest("hex")}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const client = await getOAuthClient();
  const error = params.get("error");
  if (error === "consent_required" || error === "login_required") {
    // サイレントサインインのリトライ
    const handle = req.cookies.get("HANDLE")?.value;

    if (!handle) return NextResponse.redirect("/");

    const url = await client.authorize(handle);
    return NextResponse.redirect(url);
  }

  try {
    // OAuth callback
    const { session } = await client.callback(params);

    // 認証成功
    const agent = new Agent(session);
    await agent.getProfile({ actor: agent.did || '' });

    // ログイン成功時にのみ updatedAt を更新する
    await prisma.nodeOAuthSession.update({
      where: { key: session.sub },
      data: { updatedAt: new Date() },
    }).catch((e: any) => console.error('Failed to update session updatedAt', e));
    // もし redirectTo が必要ならクッキーから取得してリダイレクト
    const redirectTo = req.cookies.get("REDIRECT_TO")?.value || "/";

    const response = NextResponse.redirect(redirectTo);

    response.cookies.set("USER_DID", signDid(session.did), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60日
    });
    response.cookies.delete({ name: "REDIRECT_TO", path: "/" });
    response.cookies.delete({ name: "HANDLE", path: "/" });
    return response

  } catch {

    const redirectTo = req.cookies.get("REDIRECT_TO")?.value || "/";

    const response = NextResponse.redirect(redirectTo);
    return response
  }
}
