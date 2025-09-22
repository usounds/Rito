import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/logic/HandlePrismaClient';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const nsidQuery = url.searchParams.get("nsid") || "";

    const resolvers = await prisma.resolver.findMany({
      where: {
        nsid: {
          startsWith: nsidQuery,
        },
      },
      orderBy: { verified: "desc" }, // verified が優先
    });

    await prisma.$disconnect();

    return NextResponse.json(resolvers);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch resolvers" }, { status: 500 });
  }
}