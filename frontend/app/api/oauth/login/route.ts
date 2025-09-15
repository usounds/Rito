import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/logic/HandlePrismaClient';

const AIP_BASE = process.env.OIDC_PROVIDER!;
const CLIENT_ID = process.env.RITO_CLIENT_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_URL}/api/oauth/callback`;

console.log(REDIRECT_URI)

// URLセーフな Base64
function base64URLEncode(str: Buffer) {
  return str.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// SHA256 ハッシュ
async function sha256(buffer: string) {
  return await crypto.subtle.digest("SHA-256", new TextEncoder().encode(buffer));
}

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle") || "";
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/";

  // PKCE code_verifier と state を生成
  const codeVerifier = crypto.randomUUID();
  const state = crypto.randomUUID();
  const hashBuffer = await sha256(codeVerifier);
  const codeChallenge = base64URLEncode(Buffer.from(hashBuffer));

  // Prismaに保存
  await prisma.oAuthState.create({
    data: {
      state,
      code_verifier: codeVerifier,
      redirect_uri: REDIRECT_URI,
      return_to: returnTo,  // ここで戻るURLを保存
    },
  });

  // /oauth/authorize へ直接リダイレクト
  const authParams = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "atproto transition:generic",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    ...(handle && { login_hint: handle }),
  });

  const authUrl = `${AIP_BASE}/oauth/authorize?${authParams.toString()}`;
  return NextResponse.redirect(authUrl);
}
