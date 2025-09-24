// app/api/status/route.ts
import { prisma } from '@/logic/HandlePrismaClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const record = await prisma.jetstreamIndex.findUnique({
      where: { service: 'rito' },
    });

    let comment: string;
    let diffMinutes = 0;

    if (!record) {
      comment = 'Currently, Rito is experiencing delays.'; // t('status.inform.delay') の代わり
    } else {
      // record.index はマイクロ秒単位
      const indexNum = BigInt(record.index);
      const indexDate = new Date(Number(indexNum) / 1000); // µs → ms
      const now = new Date();
      const diffMs = now.getTime() - indexDate.getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (diffMs > fiveMinutes) {
        diffMinutes = Math.floor(diffMs / 60000);
        comment = 'Currently, Rito is experiencing delays.'; // t('status.inform.delay')
      } else {
        diffMinutes = 0;
        comment = 'System is operating normally.'; // t('status.inform.fine')
      }
    }

    return NextResponse.json({
      comment,
      diffMinutes,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}