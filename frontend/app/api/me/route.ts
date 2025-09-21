import { getAccessToken } from "@/logic/HandleOauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // 1. アクセストークン取得（必要なら更新してクッキー返す）
    let accessToken: string | null | undefined = null;
    let updatedCookies: { key: string; value: string; maxAge?: number }[] | null | undefined;

    try {
      const result = await getAccessToken(req);
      accessToken = result.accessToken;
      updatedCookies = result.updatedCookies;

      if (!accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
    } catch (err: any) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // 2. userinfo をアクセストークンで取得
    const userInfoRes = await fetch(`${process.env.OIDC_PROVIDER}/oauth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      const errData = await userInfoRes.json();
      return NextResponse.json(errData, { status: userInfoRes.status });
    }

    const userInfo = await userInfoRes.json();

    // 3. レスポンス作成
    const res = NextResponse.json({
      did: userInfo.sub,
      handle: userInfo.handle,
      ...userInfo,
    });

    // 4. 更新したクッキーをレスポンスに追加
    if (updatedCookies) {
      updatedCookies.forEach((c) =>
        res.cookies.set(c.key, c.value, {
          httpOnly: true,
          path: "/",
          sameSite: "lax",
          maxAge: c.maxAge,
        })
      );
    }

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal Server Error", detail: err.message },
      { status: 500 }
    );
  }
}
