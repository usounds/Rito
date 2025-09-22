// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/logic/HandlePrismaClient";

export async function GET(req: NextRequest) {

  const bookmarks = await prisma.bookmark.findMany({
    orderBy: { indexed_at: 'desc' },
    take: 10,
    include: { comments: true, tags: true },
  });

  await prisma.$disconnect();

  return NextResponse.json(bookmarks);
}
