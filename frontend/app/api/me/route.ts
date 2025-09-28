import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/logic/HandleOauth";
const AIP_BASE = process.env.OIDC_PROVIDER!;

export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer");

  if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    let accessToken: string | null | undefined = null;
    let updatedCookies: { key: string; value: string; maxAge?: number }[] | null | undefined;
    let previousAccessToken: string | undefined;

    // --- アクセストークン取得 ---
    try {
      const result = await getAccessToken(req);
      accessToken = result.accessToken;
      updatedCookies = result.updatedCookies;
      previousAccessToken = req.cookies.get("access_token")?.value;
      if (!accessToken) {
        console.warn("accessToken is null");
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.warn("getAccessToken failed:", err.message);
      } else {
        console.warn("getAccessToken failed:", err);
      }
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    const fetchUserInfo = async (token: string) => {
      const res = await fetch(`${process.env.OIDC_PROVIDER}/oauth/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res;
    };

    let userInfoRes = await fetchUserInfo(accessToken);

    if ([401, 403, 500].includes(userInfoRes.status)) {
      console.warn(`userinfo ${userInfoRes.status} → アクセストークン取り直し`);
      try {
        const retry = await getAccessToken(req, true);
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

    const sessionRes = await fetch(`${AIP_BASE}/api/atprotocol/session`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });

    const sessionResJson = await sessionRes.json();

    const res = NextResponse.json({
      did: userInfo.sub,
      handle: userInfo.handle,
      scope: sessionResJson.scopes,
      ...userInfo,
    });

    // --- アクセストークンが変動した場合のみクッキーをセット ---
    if (updatedCookies && accessToken !== previousAccessToken) {
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
  } catch (err: unknown) {
    let detail: string;

    if (err instanceof Error) {
      detail = err.message;
    } else {
      // 文字列やその他オブジェクトの場合に対応
      detail = String(err);
    }

    return NextResponse.json(
      { error: "Internal Server Error", detail },
      { status: 500 }
    );
  }
}
