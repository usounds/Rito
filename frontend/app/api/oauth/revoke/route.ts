import { NextRequest, NextResponse } from "next/server";
import { client, verifySignedDid } from "@/logic/HandleOauthClientNode";

export async function GET(req: NextRequest) {
    const referer = req.headers.get("referer");

    // Referer が存在して、自サイトのURLで始まらない場合は403
    if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
        return new NextResponse("Forbidden", { status: 403 });
    }

    // USER_DID クッキーを取得
    const signedDid = req.cookies.get("USER_DID")?.value;
    if (!signedDid) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const did = verifySignedDid(signedDid);
    if (!did) {
        return new NextResponse("Invalid signature", { status: 401 });
    }

    try {
        // DID からセッションを復元
        const session = await client.restore(did);

        // サインアウト
        await session.signOut();

        // クッキーも削除してログアウト完了
        const response = NextResponse.json({ ok: true });
        response.cookies.delete("USER_DID");
        response.cookies.delete("REDIRECT_TO");

        return response;
    } catch (err: unknown) {
        console.error("Sign out error:", err);
        return NextResponse.json(
            { error: "Internal Server Error", detail: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
