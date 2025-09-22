import { NextResponse } from "next/server";
import { prisma } from '@/logic/HandlePrismaClient';
import { isDid } from '@atcute/lexicons/syntax';
import { normalizeBookmarks } from '@/type/ApiTypes';

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

    await prisma.$disconnect();

    return NextResponse.json(normalized, {
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
