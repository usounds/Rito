import { NextResponse } from "next/server";
import { prisma } from '@/logic/HandlePrismaClient';
import { isDid } from '@atcute/lexicons/syntax';
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actor = searchParams.get("actor"); // DID を取得

    if (!actor) {
      return NextResponse.json({ error: "actor parameter is required" }, { status: 400 });
    }

    let bookmarks = [];
    if (isDid(actor)) {
      // DID で直接検索
      bookmarks = await prisma.bookmark.findMany({
        where: { did: actor },
        orderBy: { indexed_at: 'desc' },
        include: {
          comments: true,
          tags: { include: { tag: true } },
        },
      });
    } else {
      // handle で検索
      bookmarks = await prisma.bookmark.findMany({
        where: { handle: actor },
        orderBy: { indexed_at: 'desc' },
        include: {
          comments: true,
          tags: { include: { tag: true } },
        },
      });
    }

    const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

    // 2. Likes を取得
    const likes: { subject: string; aturi: string }[] = await prisma.like.findMany({
      where: { subject: { in: normalized.map(b => b.uri) } },
      select: { subject: true, aturi: true },
    });

    // 3. subject → aturi 配列のマップを作成
    const likesMap: Record<string, string[]> = {};
    likes.forEach(like => {
      if (!likesMap[like.subject]) likesMap[like.subject] = [];
      likesMap[like.subject].push(like.aturi);
    });

    // 4. Bookmark に likes をセット
    const bookmarksWithLikes = normalized.map(bookmark => ({
      ...bookmark,
      likes: likesMap[bookmark.uri] || [],
    }));
    return NextResponse.json(bookmarksWithLikes, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
