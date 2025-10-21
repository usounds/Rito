// app/xrpc/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Agent } from "@atproto/api";
import { client, verifySignedDid } from "@/logic/HandleOauthClientNode";

export async function POST(req: NextRequest) {
  const referer = req.headers.get("referer");

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

  const session = await client.restore(did);
  const agent = new Agent(session);

  const body = await req.json();
  try {
    const result = await agent.com.atproto.repo.applyWrites(body)
    return NextResponse.json(result.data, { status: result.success ? 200 : 500 });
    
  } catch (e) {
    return NextResponse.json({ 'error': e }, { status: 500 });

  }

}
