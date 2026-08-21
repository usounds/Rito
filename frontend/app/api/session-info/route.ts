import { NextRequest, NextResponse } from "next/server";
import { verifySignedDid, getOAuthClient } from "@/logic/HandleOauthClientNode";
import { prisma } from "@/logic/HandlePrismaClient";
import { PRIVATE_BOOKMARK_SCOPE } from "@/type/OauthConstants";

export async function GET(req: NextRequest) {
  const signedDid = req.cookies.get("USER_DID")?.value;
  if (!signedDid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const did = verifySignedDid(signedDid);
  if (!did) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  try {
    const sessionRecord = await prisma.nodeOAuthSession.findUnique({
      where: { key: did },
      select: { updatedAt: true },
    });

    if (!sessionRecord) {
      return new NextResponse("Session not found", { status: 404 });
    }

    let hasSpaceScope = false;
    let scope = "";

    try {
      const client = await getOAuthClient();
      const oauthSession = await client.restore(did);
      const tokenInfo = await oauthSession.getTokenInfo();
      scope = tokenInfo.scope || "";
      const scopes = scope.split(" ");
      hasSpaceScope = scopes.some((s) => s.includes("blue.rito.permissionSet") || s.startsWith(PRIVATE_BOOKMARK_SCOPE) || s.startsWith("space:"));
    } catch {
      // Failed to restore token info, fallback to session info only
    }

    return NextResponse.json({
      updatedAt: sessionRecord.updatedAt,
      did,
      scope,
      hasSpaceScope,
    });
  } catch (e) {
    console.error("Failed to fetch session info", e);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
