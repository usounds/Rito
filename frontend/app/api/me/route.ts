import { NextRequest, NextResponse } from "next/server";
import { client, verifySignedDid } from "@/logic/HandleOauthClientNode";
import { Agent } from "@atproto/api";

export async function GET(req: NextRequest) {
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
  const profile = await agent.getProfile({ actor: agent.did || '' });

  const token = await session.getTokenInfo()
  const scope = token.scope

  return NextResponse.json({
    profile: profile.data,
    scope,
  });

}
