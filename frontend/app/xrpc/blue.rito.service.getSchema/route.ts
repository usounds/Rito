import { prisma } from '@/logic/HandlePrismaClient';
import { NextResponse } from 'next/server';

// /api/resolver?nsid=xxx
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const nsid = searchParams.get("nsid");

        if (!nsid) {
            return NextResponse.json({ error: "nsid parameter is required" }, { status: 400 });
        }

        // 1. Resolver を取得
        const resolvers = await prisma.resolver.findMany({
            where: { nsid },
            orderBy: { indexed_at: 'desc' },
        });

        if (resolvers.length === 0) {
            return NextResponse.json({ error: "No resolver found" }, { status: 404 });
        }

        // 2. schema を決定
        let selectedSchema: string;
        const verified = resolvers.find(r => r.verified);

        if (verified) {
            selectedSchema = verified.schema;
        } else {
            // 多数決
            const schemaCount = resolvers.reduce<Record<string, number>>((acc, r) => {
                acc[r.schema] = (acc[r.schema] || 0) + 1;
                return acc;
            }, {});

            const maxCount = Math.max(...Object.values(schemaCount));
            const candidates = Object.keys(schemaCount).filter(
                (s) => schemaCount[s] === maxCount
            );

            if (candidates.length === 1) {
                selectedSchema = candidates[0];
            } else {
                // indexed_at が新しいもの
                const latest = resolvers.find(r => candidates.includes(r.schema));
                selectedSchema = latest!.schema;
            }
        }

        // 3. schema からドメインを抽出
        let domain: string;
        try {
            const u = new URL(selectedSchema);  // 例: "https://skyblur.uk/post/{did}/{rkey}"
            domain = u.hostname;                // → "skyblur.uk"
        } catch {
            // schema が URL でない場合の fallback
            return NextResponse.json({ error: `Schema value is invalid. ${selectedSchema}` }, { status: 404 });
        }

        // 4. Bookmark を検索
        const bookmarks = await prisma.bookmark.findMany({
            where: {
                subject: {
                    startsWith: `https://${domain}/`,
                },
            },
            orderBy: { indexed_at: 'desc' },
            include: {
                comments: true,
                tags: {
                    include: {
                        tag: true,
                    },
                },
            },
        });

        if (bookmarks.length === 0) {
            return NextResponse.json({ error: "No bookmark found" }, { status: 404 });
        }
        const selectedBookmark =
            bookmarks.find((b) => b.tags.some((t) => t.tag.name === "Verified")) ??
            bookmarks[0];

        // トップレベル verified
        const bookmarkVerified = selectedBookmark.tags.some((t) => t.tag.name === "Verified");

        // 整形して返す
        const result = {
            nsid,
            schema: selectedSchema,
            ogpTitle: selectedBookmark.ogp_title,
            ogpDescription: selectedBookmark.ogp_description,
            tags: selectedBookmark.tags.map((t) => t.tag.name),
            moderations: selectedBookmark.moderation_result || [],
            verified: bookmarkVerified,
            comments: selectedBookmark.comments.map((c) => ({
                lang: c.lang,
                title: c.title,
                comment: c.comment,
                moderations: c.moderation_result || [],
                verified: bookmarkVerified, // コメント単位も同じ判定にするなら同じ値
            })),
        };
        return NextResponse.json(result, {
            status: 200,
            headers: {
                "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=300",
            },
        });
    } catch (err) {
        console.error("Error fetching resolver/bookmark:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
