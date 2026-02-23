import { NextRequest, NextResponse } from "next/server";
import { verifySignedDid } from "@/logic/HandleOauthClientNode";
import { prisma } from "@/logic/HandlePrismaClient";

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
        const session = await prisma.nodeOAuthSession.findUnique({
            where: { key: did },
            select: { updatedAt: true }
        });

        if (!session) {
            return new NextResponse("Session not found", { status: 404 });
        }

        return NextResponse.json({ updatedAt: session.updatedAt });
    } catch (e) {
        console.error("Failed to fetch session info", e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
