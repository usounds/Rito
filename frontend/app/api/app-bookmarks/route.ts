import { prisma } from '@/logic/HandlePrismaClient';
import { NextRequest, NextResponse } from 'next/server';
import { nsidToDomain } from '@/logic/HandleNsidAggregation';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const nsidsParam = searchParams.get("nsids");

        if (!nsidsParam) {
            return NextResponse.json({ error: "nsids parameter is required" }, { status: 400 });
        }

        const nsids = nsidsParam.split(",");
        const results: Record<string, any> = {};

        // ドメインとURLの候補を生成
        const nsidToUrlMap: Record<string, string[]> = {};
        const allUrls: string[] = [];

        for (const nsid of nsids) {
            const domain = nsidToDomain(nsid);
            const urls = [
                `https://${domain}/`,
                `https://${domain}`,
                `http://${domain}/`,
                `http://${domain}`
            ];
            nsidToUrlMap[nsid] = urls;
            allUrls.push(...urls);
        }

        // Bookmarkをユニークなsubjectで一括取得
        const bookmarks = await prisma.bookmark.findMany({
            where: {
                subject: { in: allUrls }
            },
            include: {
                tags: {
                    include: {
                        tag: true
                    }
                }
            },
            orderBy: { indexed_at: 'desc' }
        });

        // NSIDごとに最適なブックマークを割り当て
        for (const nsid of nsids) {
            const candidateUrls = nsidToUrlMap[nsid];
            const matches = bookmarks.filter(b => candidateUrls.includes(b.subject));

            if (matches.length > 0) {
                // Verified タグがあるものを優先、なければ最新のもの
                const selected = matches.find(b => b.tags.some(t => t.tag.name === "Verified")) || matches[0];
                
                // タグをマージ
                const allTags = new Set<string>();
                matches.forEach(b => {
                    b.tags.forEach(t => allTags.add(t.tag.name));
                });

                // 最小のcreated_atを取得（最も古い登録日）
                const minCreatedAt = matches.reduce((min, b) => 
                    (b.created_at < min ? b.created_at : min), 
                    matches[0].created_at
                );

                results[nsid] = {
                    nsid,
                    ogpTitle: selected.ogp_title,
                    ogpDescription: selected.ogp_description,
                    ogpImage: selected.ogp_image,
                    tags: Array.from(allTags),
                    moderations: selected.moderation_result ? JSON.parse(selected.moderation_result) : [],
                    verified: selected.tags.some(t => t.tag.name === "Verified"),
                    indexedAt: minCreatedAt.toISOString()
                };
            } else {
                results[nsid] = { nsid, error: "No bookmark found" };
            }
        }

        return NextResponse.json({ results });
    } catch (err: any) {
        console.error("[app-bookmarks] Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
