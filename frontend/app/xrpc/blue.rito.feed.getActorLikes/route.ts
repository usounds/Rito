import { NextResponse } from "next/server";
import { prisma } from '@/logic/HandlePrismaClient';
import { isDid } from '@atcute/lexicons/syntax';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const actor = searchParams.get("actor"); // DID または handle

    if (!actor) {
      return NextResponse.json({ error: "actor parameter is required" }, { status: 400 });
    }

    let likes = [];
    if (isDid(actor)) {
      // DID で検索
      likes = await prisma.like.findMany({
        where: { did: actor },
        orderBy: { created_at: 'desc' },
      });
    } else {
      // handle で検索
      // まず DID を取得する
      const user = await prisma.userDidHandle.findFirst({
        where: { handle: actor },
      });

      if (!user) {
        return NextResponse.json([], { status: 200 });
      }

      likes = await prisma.like.findMany({
        where: { did: user.did },
        orderBy: { created_at: 'desc' },
      });
    }

    return NextResponse.json(likes, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Error fetching likes:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
