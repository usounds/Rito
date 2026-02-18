import { NextResponse } from "next/server";
import { prisma } from '@/logic/HandlePrismaClient';
import { isDid } from '@atcute/lexicons/syntax';
import { Bookmark } from '@/type/ApiTypes';
import { normalizeBookmarks } from '@/logic/HandleBookmark';

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

    // 2. Likes を取得（AT URI と HTTP URL の両方を対象に）
    const allTargets = normalized.flatMap(b => {
      const variants = [b.uri]; // AT URI
      // HTTP URL + 末尾スラッシュバリエーション
      if (b.subject) {
        variants.push(b.subject);
        variants.push(b.subject.endsWith('/') ? b.subject.slice(0, -1) : b.subject + '/');
      }
      return variants;
    });
    const uniqueTargets = Array.from(new Set(allTargets));

    const likes: { subject: string; aturi: string }[] = await prisma.like.findMany({
      where: { subject: { in: uniqueTargets } },
      select: { subject: true, aturi: true },
    });

    // 3. bookmark.uri → aturi 配列のマップを作成（AT URI + HTTP URL の Like を統合）
    const bookmarksWithLikes = normalized.map(bookmark => {
      const subjectVariants = new Set([
        bookmark.uri,
        bookmark.subject,
        bookmark.subject.endsWith('/') ? bookmark.subject.slice(0, -1) : bookmark.subject + '/',
      ]);
      const matchingLikes = [...new Set(
        likes
          .filter(like => subjectVariants.has(like.subject))
          .map(like => like.aturi)
      )];
      return { ...bookmark, likes: matchingLikes };
    });
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
