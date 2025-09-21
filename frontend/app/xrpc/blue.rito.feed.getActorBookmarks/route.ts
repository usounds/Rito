import { prisma } from '@/logic/HandlePrismaClient';
import { normalizeBookmarks } from '@/type/ApiTypes';
import { isDid } from '@atcute/lexicons/syntax';
import { NextResponse } from "next/server";

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

    const normalized = normalizeBookmarks(bookmarks)
    return NextResponse.json(normalized);
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
