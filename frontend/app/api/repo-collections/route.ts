import { NextRequest, NextResponse } from "next/server";
import { verifySignedDid, getOAuthClient } from "@/logic/HandleOauthClientNode";
import { Agent } from "@atproto/api";
import publicSuffixList from '@/data/publicSuffixList.json';

function aggregateNsids(nsids: string[]): string[] {
    const aggregated = new Set<string>();
    const psl = publicSuffixList as string[];

    for (const nsid of nsids) {
        const segments = nsid.split('.');
        if (segments.length < 2) {
            aggregated.add(nsid);
            continue;
        }

        let suffixLength = 0;
        for (let i = 1; i < segments.length; i++) {
            const currentPrefix = segments.slice(0, i);
            const domainStyle = [...currentPrefix].reverse().join('.');
            if (psl.includes(domainStyle)) {
                suffixLength = i;
            } else {
                break;
            }
        }

        const aggregateLength = suffixLength > 0 ? suffixLength + 1 : 2;
        const result = segments.slice(0, Math.min(aggregateLength, segments.length)).join('.');
        aggregated.add(result);
    }

    return Array.from(aggregated).sort();
}

export async function GET(req: NextRequest) {
    const signedDid = req.cookies.get("USER_DID")?.value;
    if (!signedDid) {
        console.warn("[repo-collections] USER_DID cookie not found.");
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const did = verifySignedDid(signedDid);
    if (!did) {
        console.warn("[repo-collections] Invalid signed DID:", signedDid);
        return new NextResponse("Invalid signature", { status: 401 });
    }

    console.log("[repo-collections] Fetching collections for DID:", did);

    try {
        const client = await getOAuthClient();
        const session = await client.restore(did);
        if (!session) {
            console.error("[repo-collections] Failed to restore session for DID:", did);
            return new NextResponse("Session not found", { status: 404 });
        }

        const agent = new Agent(session);

        // describeRepo を実行
        const response = await agent.com.atproto.repo.describeRepo({
            repo: did
        });

        if (!response.success) {
            console.error("[repo-collections] PDS xrpc failure:", response.status, response.data);
            return new NextResponse("Failed to fetch repo collections", { status: 502 });
        }

        const collections = response.data.collections;
        console.log("[repo-collections] Raw collections:", collections);

        const aggregated = aggregateNsids(collections);
        console.log("[repo-collections] Aggregated collections:", aggregated);

        return NextResponse.json({
            ...response.data,
            collections: aggregated // 集計済みのものを返す
        });
    } catch (e: any) {
        if (e.message?.includes("The session was deleted by another process")) {
            console.warn("[repo-collections] Session lost detected:", e.message);
            return new NextResponse("Unauthorized", { status: 401 });
        }
        console.error("[repo-collections] Unexpected error:", e.message || e);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
