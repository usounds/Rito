import { NextRequest, NextResponse } from "next/server";

const AIP_BASE = process.env.OIDC_PROVIDER!;
const CLIENT_ID = process.env.RITO_CLIENT_ID!;
const CLIENT_SECRET = process.env.RITO_CLIENT_SECRET!;

export async function GET(req: NextRequest) {
    try {
        // クッキーからアクセストークンとリフレッシュトークンを取得
        const accessToken = req.cookies.get("access_token")?.value;
        const refreshToken = req.cookies.get("refresh_token")?.value;

        // OIDC /revoke エンドポイント呼び出し
        const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

        // アクセストークンを無効化
        if (accessToken) {
            await fetch(`${AIP_BASE}/oauth/revoke`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${basicAuth}`,
                },
                body: new URLSearchParams({
                    token: accessToken,
                    token_type_hint: "access_token",
                }),
            });
        }

        // リフレッシュトークンを無効化
        if (refreshToken) {
            await fetch(`${AIP_BASE}/oauth/revoke`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${basicAuth}`,
                },
                body: new URLSearchParams({
                    token: refreshToken,
                    token_type_hint: "refresh_token",
                }),
            });
        }

        // クッキー削除
        const res = NextResponse.json({ ok: true, message: "Logged out" });

        // クッキー削除
        res.cookies.set("access_token", "", { httpOnly: true, path: "/", sameSite: "lax", maxAge: 0 });
        res.cookies.set("refresh_token", "", { httpOnly: true, path: "/", sameSite: "lax", maxAge: 0 });

        return res;
    } catch (err: any) {
        console.error("Logout error:", err);
        return NextResponse.json({ error: "Internal Server Error", detail: err.message }, { status: 500 });
    }
}
