import { prisma } from '@/logic/HandlePrismaClient';
import { normalizeBookmarks } from '@/type/ApiTypes';
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const did = searchParams.get("did");

    if (!subject && !did) {
      return NextResponse.json({ error: "subject and did parameter is required" }, { status: 400 });
    }

    const where: any = {};
    if (subject) where.subject = subject;
    if (did) where.did = did;

    const bookmarks = await prisma.bookmark.findMany({
      where,
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

    const normalized = normalizeBookmarks(bookmarks);
    return NextResponse.json(normalized);
  } catch (err) {
    console.error("Error fetching bookmarks:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
