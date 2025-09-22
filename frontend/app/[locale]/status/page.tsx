// frontend/app/[locale]/status/page.tsx
import Breadcrumbs from "@/components/Breadcrumbs";
import { Stats } from '@/components/stats/Stats';
import { prisma } from '@/logic/HandlePrismaClient';
import { Container ,Text} from '@mantine/core';
import { getTranslations } from "next-intl/server";

export const revalidate = 60; // 5分ごとに再生成

type StatusProps = {
    params: { locale: string };
};

export async function generateStaticParams() {
    // routing.locales は ['en', 'ja'] などの配列
    return ['en', 'ja'].map(locale => ({ locale }));
}

export default async function StatusPage({ params }: StatusProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale });

    const bookmarks = await prisma.bookmark.count({});
    const tags = await prisma.tag.count({});
    const uniqueDids = await prisma.bookmark.groupBy({
        by: ['did'],
        _count: true,
    }); const record = await prisma.jetstreamIndex.findUnique({
        where: { service: 'rito' },
    });

    let comment: string;
    let diffMinutes: number = 0

    if (!record) {
        comment = t('status.inform.delay');
    } else {
        // record.index はマイクロ秒単位
        const indexNum = BigInt(record.index);
        const indexDate = new Date(Number(indexNum) / 1000); // µs → ms
        const now = new Date();
        const diffMs = now.getTime() - indexDate.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (diffMs > fiveMinutes) {
            diffMinutes = Math.floor(diffMs / 60000);
            comment = t('status.inform.delay');
        } else {
            diffMinutes = 0;
            comment = t('status.inform.fine');
        }
    }

    await prisma.$disconnect();

    return (
        <Container size="md" mx="auto" >
            <Breadcrumbs items={[{ label: t('status.title') }]} />
            <Text mt='sm'>{ t('status.description') }</Text>
            <Stats
                data={[
                    { title: t('status.field.bookmark'), icon: 'bookmark', value: bookmarks, diff: 0 },
                    { title: t('status.field.tag'), icon: 'tag', value: tags, diff: 0 },
                    { title: t('status.field.user'), icon: 'user', value: uniqueDids.length, diff: 0 },
                    { title: t('status.field.server'), icon: 'server', value: comment, diff: diffMinutes * -1 || 0 },
                ]}
            />
        </Container>
    );
}
