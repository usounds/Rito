import { NextRequest, NextResponse } from "next/server";
import { client, verifySignedDid } from "@/logic/HandleOauthClientNode";
import { Agent } from "@atproto/api";

export async function GET(req: NextRequest) {

    const csrfHeader = req.headers.get("x-csrf-token");
    const csrfCookie = req.cookies.get("CSRF_TOKEN")?.value;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
        return new NextResponse("Invalid CSRF token", { status: 403 });
    }

    const signedDid = req.cookies.get("USER_DID")?.value;
    if (!signedDid) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const did = verifySignedDid(signedDid);
    if (!did) {
        return new NextResponse("Invalid signature", { status: 401 });
    }

    const session = await client.restore(did);
    const agent = new Agent(session);


    const lxmParam = req.nextUrl.searchParams.get("lxm");
    if (!lxmParam) {
        return new NextResponse("Missing lxm parameter", { status: 400 });
    }

    const origin = process.env.NEXT_PUBLIC_URL || ''
    const url = new URL(origin)
    const audience = `did:web:${url.hostname}`

    let token = ''

    try {
        let tokenRaw = await agent.com.atproto.server.getServiceAuth({
            aud: audience,
            lxm: lxmParam
        });
        token = tokenRaw.data.token
    } catch {

        let tokenRaw = await agent.com.atproto.server.getServiceAuth({
            aud: audience,
            lxm: lxmParam
        });
        token = tokenRaw.data.token
    }

    if (!token) {
        let tokenRaw = await agent.com.atproto.server.getServiceAuth({
            aud: audience,
            lxm: lxmParam
        });
        token = tokenRaw.data.token
    }
    const response = NextResponse.json({ token: token })
    // Cookie を削除
    response.cookies.delete({
        name: 'CSRF_TOKEN',
        path: '/',
    });


    return response;
}