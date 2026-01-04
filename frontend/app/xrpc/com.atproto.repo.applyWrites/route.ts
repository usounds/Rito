// app/xrpc/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, verifySignedDid,getAgent } from "@/logic/HandleOauthClientNode";

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
  
  const { agent } = await getAgent(did, client);

  const body = await req.json();
  try {
    const result = await agent.com.atproto.repo.applyWrites(body)
    const response = NextResponse.json(result.data, {
      status: result.success ? 200 : 500,
    });

    // Cookie を削除
    response.cookies.delete({
      name: 'CSRF_TOKEN',
      path: '/', 
    });

    return response;

  } catch (e) {
    return NextResponse.json({ 'error': e }, { status: 500 });

  }

}
