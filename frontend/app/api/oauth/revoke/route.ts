import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const referer = req.headers.get("referer");

    // Referer が存在して、自サイトのURLで始まらない場合は403
    if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    try {

        // アクセストークンを無効化
        /*

        // クッキーからアクセストークンとリフレッシュトークンを取得
        const CLIENT_ID = process.env.RITO_CLIENT_ID!;
        const CLIENT_SECRET = process.env.RITO_CLIENT_SECRET!;

        const accessToken = req.cookies.get("access_token")?.value;
        const refreshToken = req.cookies.get("refresh_token")?.value;

        // OIDC /revoke エンドポイント呼び出し
        const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");

        if (accessToken) {
            const ret = await fetch(`${AIP_BASE}/oauth/revoke`, {
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
            console.log(ret)
        }
        */

        // リフレッシュトークンを無効化
        /*
        if (refreshToken) {
            const ret = await fetch(`${AIP_BASE}/oauth/revoke`, {
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
            console.log(ret)
        }
        */

        // クッキー削除
        const res = NextResponse.json({ ok: true, message: "Logged out" });

        // クッキー削除
        res.cookies.set("access_token", "", { httpOnly: true, path: "/", sameSite: "lax", maxAge: 0 });
        res.cookies.set("refresh_token", "", { httpOnly: true, path: "/", sameSite: "lax", maxAge: 0 });

        return res;
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("Logout error:", err);
            return NextResponse.json(
                { error: "Internal Server Error", detail: err.message },
                { status: 500 }
            );
        } else {
            console.error("Logout error:", err);
            return NextResponse.json(
                { error: "Internal Server Error", detail: String(err) },
                { status: 500 }
            );
        }
    }

}
