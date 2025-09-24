import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/logic/HandleOauth";

export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer");

  // Referer が存在して、自サイトのURLで始まらない場合は403
  if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    let accessToken: string | null | undefined = null;
    let updatedCookies: { key: string; value: string; maxAge?: number }[] | null | undefined;

    // --- アクセストークン取得 ---
    try {
      const result = await getAccessToken(req);
      accessToken = result.accessToken;
      updatedCookies = result.updatedCookies;
      if (!accessToken) {
      console.warn("accessToken is null");
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
    } catch (err: any) {
      console.warn("getAccessToken failed:", err.message);
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    // --- userinfo 取得関数 ---
    const fetchUserInfo = async (token: string) => {
      const res = await fetch(`${process.env.OIDC_PROVIDER}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res;
    };

    let userInfoRes = await fetchUserInfo(accessToken);

    // --- userinfo が 401/403/500 → アクセストークン取り直し ---
    if ([401, 403, 500].includes(userInfoRes.status)) {
      console.warn(`userinfo ${userInfoRes.status} → アクセストークン取り直し`);
      try {
        const retry = await getAccessToken(req, true); // 第二引数 true でリフレッシュ
        accessToken = retry.accessToken;
        updatedCookies = retry.updatedCookies;
        if (accessToken) {
          userInfoRes = await fetchUserInfo(accessToken);
        }
      } catch (refreshErr) {
        console.error("アクセストークン更新失敗:", refreshErr);
        return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
      }
    }

    if (!userInfoRes.ok) {
      const errData = await userInfoRes.json().catch(() => ({}));
      console.error("userinfo error:", userInfoRes.status, errData);
      return NextResponse.json(errData, { status: userInfoRes.status });
    }

    const userInfo = await userInfoRes.json();

    // --- レスポンス作成 ---
    const res = NextResponse.json({
      did: userInfo.sub,
      handle: userInfo.handle,
      ...userInfo,
    });

    // --- 更新したクッキーをレスポンスに追加 ---
    if (updatedCookies) {
    console.log("updatedCookies");
      updatedCookies.forEach((c) =>
        res.cookies.set(c.key, c.value, {
          httpOnly: true,
          secure: true,
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
