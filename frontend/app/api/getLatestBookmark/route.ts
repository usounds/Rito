// app/api/bookmarks/route.ts
import { prisma } from "@/logic/HandlePrismaClient";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {

  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { indexed_at: 'desc' },
    take: 10,
    include: { comments: true, tags: true },
  });

  return NextResponse.json(bookmarks);
}
