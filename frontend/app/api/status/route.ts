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
      let indexDate: Date;
      const rawIndex = record.index;

      if (rawIndex.includes(':')) {
        const timePart = rawIndex.split(':')[1];
        if (timePart.includes('-') || timePart.includes('T')) {
          indexDate = new Date(timePart);
        } else {
          const timeUs = Number(timePart);
          indexDate = new Date(timeUs >= 1e14 ? timeUs / 1000 : timeUs);
        }
      } else {
        const indexNum = Number(rawIndex);
        if (indexNum >= 1e14) {
          indexDate = new Date(indexNum / 1000);
        } else {
          indexDate = new Date();
        }
      }

      if (isNaN(indexDate.getTime())) {
        indexDate = new Date();
      }

      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - indexDate.getTime());
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