import { prisma } from '@/logic/HandlePrismaClient';
import { Agent } from "@atproto/api";

type SocialGraphType = 'follow';

/**
 * Syncs the 'follows' list from Bluesky to the database.
 * @param userDid The DID of the user who is following others.
 * @param agent An authenticated Atproto Agent.
 */
export async function syncFollows(userDid: string, agent: Agent) {
    let cursor: string | undefined;
    const allFollows: string[] = [];

    // Use unauthenticated agent to fetch public graph data
    // This avoids "Missing required scope" errors for graph.getFollows
    const publicAgent = new Agent({ service: 'https://public.api.bsky.app' });

    // 1. Fetch all follows from Bluesky
    do {
        const res = await publicAgent.app.bsky.graph.getFollows({ actor: userDid, cursor, limit: 100 });
        if (!res.success) throw new Error("Failed to fetch follows");

        const follows = res.data.follows.map((f: { did: string }) => f.did);
        allFollows.push(...follows);
        cursor = res.data.cursor;
    } while (cursor);

    // 2. Clear existing 'follow' records for this user (optional: strictly sync)
    // approach: delete existing 'follow' type where observerDid = userDid, then insert new.
    await prisma.socialGraph.deleteMany({
        where: {
            observerDid: userDid,
            type: 'follow',
        }
    });

    // 3. Bulk insert new records
    if (allFollows.length > 0) {
        // Create chunks to avoid parameter limits if necessary, though createMany handles reasonable batch sizes.
        // Prisma createMany is efficient.
        await prisma.socialGraph.createMany({
            data: allFollows.map(targetDid => ({
                observerDid: userDid,
                targetDid: targetDid,
                type: 'follow',
            })),
            skipDuplicates: true,
        });
    }

    return allFollows.length;
}

/**
 * Syncs the 'followers' list from Bluesky to the database.
 * @param userDid The DID of the user who is being followed.
 * @param agent An authenticated Atproto Agent.
 */
export async function syncFollowers(userDid: string, agent: Agent) {
    let cursor: string | undefined;
    const allFollowers: string[] = [];

    // Use unauthenticated agent to fetch public graph data
    // This avoids "Missing required scope" errors for graph.getFollows
    const publicAgent = new Agent({ service: 'https://public.api.bsky.app' });

    // 1. Fetch all followers
    do {
        const res = await publicAgent.app.bsky.graph.getFollowers({ actor: userDid, cursor, limit: 100 });
        if (!res.success) throw new Error("Failed to fetch followers");

        const followers = res.data.followers.map((f: { did: string }) => f.did);
        allFollowers.push(...followers);
        cursor = res.data.cursor;
    } while (cursor);

    // 2. Clear existing 'follow' records where targetDid = userDid
    // Note: We are storing "A follows B". So here, observer=Follower, target=Me.
    await prisma.socialGraph.deleteMany({
        where: {
            targetDid: userDid,
            type: 'follow',
        }
    });

    // 3. Bulk insert
    if (allFollowers.length > 0) {
        await prisma.socialGraph.createMany({
            data: allFollowers.map(observerDid => ({
                observerDid: observerDid, // The follower
                targetDid: userDid,       // Me
                type: 'follow',
            })),
            skipDuplicates: true,
        });
    }

    return allFollowers.length;
}
