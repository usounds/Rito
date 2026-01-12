import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, verifySignedDid } from '@/logic/HandleOauthClientNode'
import { Agent } from "@atproto/api";

async function getProfileWithRetry(
  agent: Agent,
  actor: string,
  retries = 3,
  delayMs = 300
) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await agent.getProfile({ actor });
    } catch (err) {
      lastError = err;

      // 最後の試行ならそのまま投げる
      if (i === retries - 1) {
        throw err;
      }

      // 少し待つ（バックオフ）
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }

  // 通常ここには来ないが、型安全のため
  throw lastError;
}

export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer");

  if (referer && !referer.startsWith(process.env.NEXT_PUBLIC_URL!)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const signedDid = req.cookies.get("USER_DID")?.value;
  if (!signedDid) {
    const response = new NextResponse("Unauthorized", { status: 401 });
    response.cookies.delete({ name: "USER_DID", path: "/" });
    return response;
  }

  const did = verifySignedDid(signedDid);
  if (!did) {
    const response = new NextResponse("Invalid signature", { status: 401 });
    response.cookies.delete({ name: "USER_DID", path: "/" });
    return response;
  }

  const client = await getOAuthClient();
  const session = await client.restore(did);
  const agent = new Agent(session);
  const profile = await getProfileWithRetry(
    agent,
    agent.did || '',
    3
  );

  const token = await session.getTokenInfo()
  const scope = token.scope

  return NextResponse.json({
    profile: profile.data,
    scope,
  });

}
