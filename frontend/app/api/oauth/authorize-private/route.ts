import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, verifySignedDid } from "@/logic/HandleOauthClientNode";
import { SCOPE, PRIVATE_BOOKMARK_SCOPE } from "@/type/OauthConstants";

type Body = {
  returnTo?: string;
  csrf: string;
};

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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { returnTo = "/my/bookmark", csrf } = body;

  const csrfCookie = req.cookies.get("CSRF_TOKEN")?.value;
  if (!csrf || !csrfCookie || csrf !== csrfCookie) {
    return new NextResponse("Invalid CSRF token", { status: 403 });
  }

  if (
    !returnTo.startsWith("/") &&
    !returnTo.startsWith(process.env.NEXT_PUBLIC_URL!)
  ) {
    return new NextResponse("Invalid Return To", { status: 403 });
  }

  const client = await getOAuthClient();
  const oauthSession = await client.restore(did);

  let currentScopes: string[] = [];
  try {
    const tokenInfo = await oauthSession.getTokenInfo();
    currentScopes = (tokenInfo.scope || "").split(" ").filter(Boolean);
  } catch {
    currentScopes = SCOPE;
  }

  const newScopes = Array.from(
    new Set([...currentScopes, ...SCOPE, PRIVATE_BOOKMARK_SCOPE])
  ).join(" ");

  const url = await client.authorize(did, {
    scope: newScopes,
    prompt: "consent",
  });

  const response = NextResponse.json({ url: url.toString() });

  response.cookies.set("REDIRECT_TO", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 5,
  });

  // CSRF is single use
  response.cookies.delete({ name: "CSRF_TOKEN", path: "/" });

  return response;
}
