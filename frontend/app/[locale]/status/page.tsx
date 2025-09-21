import Breadcrumbs from "@/components/Breadcrumbs";
import { Stats } from '@/components/stats/Stats';
import { prisma } from '@/logic/HandlePrismaClient';
import { Container } from '@mantine/core';
import { getTranslations } from "next-intl/server";

export const revalidate = 300; // 5分ごとに再生成

type StatusProps = {
    params: { locale: string };
};

const Status = async ({ params }: StatusProps) => {
    const { locale } = await params;
    const t = await getTranslations({ locale });

    const bookmarks = await prisma.bookmark.count({});
    const tags = await prisma.tag.count({});
    const uniqueDids = await prisma.bookmark.groupBy({
        by: ['did'],
        _count: true,
    });

    // service=rito の最新レコードを取得
    const record = await prisma.jetstreamIndex.findUnique({
        where: { service: 'rito' },
    });

    let comment: string;
    let diffMinutes: number | null = null; // 遅れ分（分単位）

    if (!record) {
        // データなしの場合は遅延扱いにするか適宜設定
        comment = t('status.inform.delay');
    } else {
        // index は string なので bigint に変換
        const indexNum = BigInt(record.index);

        // ミリ秒として Date に変換
        const indexDate = new Date(Number(indexNum));

        const now = new Date();
        const diffMs = now.getTime() - indexDate.getTime();

        const fiveMinutes = 5 * 60 * 1000;

        if (diffMs > fiveMinutes) {
            diffMinutes = Math.floor(diffMs / 60000); // ミリ秒 → 分
            comment = t('status.inform.delay'); // 5分以上経過
        } else {
            diffMinutes = 0
            comment = t('status.inform.fine');  // 5分以内

        }
    }

    return (
        <Container size="md" mx="auto" >
            <Breadcrumbs items={[{ label: t('status.title') }]} />
            <Stats
                data={[
                    { title: t('status.field.bookmark'), icon: 'bookmark', value: bookmarks.valueOf(), diff: 0 },
                    { title: t('status.field.tag'), icon: 'tag', value: tags.valueOf(), diff: 0 },
                    { title: t('status.field.user'), icon: 'user', value: uniqueDids.length, diff: 0 },
                    { title: t('status.field.server'), icon: 'server', value: comment, diff: diffMinutes||0 },
                ]}
            />
        </Container>
    );
};

export default Status;
