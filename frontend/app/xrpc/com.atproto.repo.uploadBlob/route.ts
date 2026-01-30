
import { NextRequest, NextResponse } from "next/server";
import { Agent } from "@atproto/api";
import { getOAuthClient, verifySignedDid } from "@/logic/HandleOauthClientNode";

export async function POST(req: NextRequest) {
    const referer = req.headers.get("referer");

    const csrfCookie = req.cookies.get("CSRF_TOKEN")?.value;
    const csrfHeader = req.headers.get("x-csrf-token");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return new NextResponse("Invalid CSRF token", { status: 403 });
    }

    if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
        return new NextResponse("Forbidden", { status: 403 });
    }
    const signedDid = req.cookies.get("USER_DID")?.value;
    if (!signedDid) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const did = verifySignedDid(signedDid);
    if (!did) {
        return new NextResponse("Invalid signature", { status: 401 });
    }

    const client = await getOAuthClient();
    const session = await client.restore(did);
    const agent = new Agent(session);

    // Blobデータを取得
    const blob = await req.blob();
    const contentType = req.headers.get("content-type") || "application/octet-stream";

    // バッファに変換 (agent.uploadBlob は Uint8Array | Blob を受け付けるが、NextJSのRequest Blobから変換が必要な場合がある)
    const buffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    try {
        const result = await agent.uploadBlob(uint8Array, { encoding: contentType });

        const response = NextResponse.json(result.data, {
            status: result.success ? 200 : 500,
        });

        return response;

    } catch (e) {
        console.error("uploadBlob failed", e);
        return NextResponse.json({ 'error': String(e) }, { status: 500 });
    }

}
