import { prisma } from '@/logic/HandlePrismaClient';
import { normalizeBookmarks } from '@/type/ApiTypes';
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const uri = searchParams.get("uri"); // DID を取得

    if (!uri) {
      return NextResponse.json({ error: "uri parameter is required" }, { status: 400 });
    }

    // DID で Bookmark を検索
    const bookmarks = await prisma.bookmark.findMany({
      where: { uri: uri },
      orderBy: { indexed_at: 'desc' },
      include: {
        comments: true,
        tags: {
          include: {
            tag: true, // BookmarkTag → Tag をネストして取得
          },
        },
      },
    });

    const normalized = normalizeBookmarks(bookmarks)
    return NextResponse.json(normalized);
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
