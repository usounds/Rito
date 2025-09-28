// app/api/bookmarks/route.ts
import { NextResponse } from 'next/server';
import { prisma } from "@/logic/HandlePrismaClient";

export async function GET() {

  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { indexed_at: 'desc' },
    take: 10,
    include: { comments: true, tags: true },
  });

  return NextResponse.json(bookmarks);
}
