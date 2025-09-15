import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from '@/logic/HandleOauth';

export async function GET(req: NextRequest) {
  try {
    const { accessToken, updatedCookies } = await getAccessToken(req);

    if (!accessToken) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // クッキー更新があればセット
    const res = NextResponse.next();
    if (updatedCookies) {
      updatedCookies.forEach((c) =>
        res.cookies.set(c.key, c.value, { httpOnly: true, path: "/", sameSite: "lax", maxAge: c.maxAge })
      );
    }

    const userInfoRes = await fetch(`${process.env.OIDC_PROVIDER}/oauth/userinfo`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      const errData = await userInfoRes.json();
      return NextResponse.json(errData, { status: userInfoRes.status });
    }

    const userInfo = await userInfoRes.json();
    return NextResponse.json({
      did: userInfo.sub,
      handle: userInfo.handle,
      ...userInfo,
    });
  } catch (err: any) {
    console.error("Error fetching user info:", err);
    return NextResponse.json({ error: "Internal Server Error", detail: err.message }, { status: 500 });
  }
}
