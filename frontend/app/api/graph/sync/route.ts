import { NextRequest, NextResponse } from "next/server";
import { verifySignedDid, getOAuthClient } from "@/logic/HandleOauthClientNode";
import { Agent } from "@atproto/api";
import { syncFollows, syncFollowers } from "@/logic/GraphSyncUtil";

// Reusing logic from verifySignedDid or creating a helper to get the agent would be better,
// but for now, we'll inline the session restoration similar to existing routes.

async function getAuthenticatedAgent(req: NextRequest) {
    const signedDid = req.cookies.get("USER_DID")?.value;
    if (!signedDid) return null;

    const did = verifySignedDid(signedDid);
    if (!did) return null;

    const client = await getOAuthClient();
    try {
        const session = await client.restore(did);
        return { agent: new Agent(session), did };
    } catch (e) {
        console.error("Failed to restore session", e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    const auth = await getAuthenticatedAgent(req);
    if (!auth) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { type } = body; // 'follows' | 'followers' | 'both'

    try {
        if (type === 'follows' || type === 'both') {
            await syncFollows(auth.did);
        }
        if (type === 'followers' || type === 'both') {
            await syncFollowers(auth.did);
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        console.error("Sync failed", error);
        return new NextResponse(message, { status: 500 });
    }
}
