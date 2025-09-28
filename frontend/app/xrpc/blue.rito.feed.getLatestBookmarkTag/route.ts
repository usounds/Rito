import { prisma } from '@/logic/HandlePrismaClient';
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 直近 40 件のブックマークを取得
    const recentBookmarks = await prisma.bookmark.findMany({
      orderBy: { indexed_at: 'desc' },
      take: 80,
      include: {
        tags: {
          include: {
            tag: true, // BookmarkTag → Tag をネストして取得
          },
        },
      },
    });

    // タグごとの件数をカウント
    const tagCountMap = new Map<string, number>();

    for (const bookmark of recentBookmarks) {
      for (const bt of bookmark.tags) {
        const tagName = bt.tag.name;
        tagCountMap.set(tagName, (tagCountMap.get(tagName) ?? 0) + 1);
      }
    }

    // { tag: string, count: number } の配列に変換
    const tagsWithCount = Array.from(tagCountMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count); // 出現回数が多い順にソート

    return NextResponse.json(tagsWithCount, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Error fetching tags:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
