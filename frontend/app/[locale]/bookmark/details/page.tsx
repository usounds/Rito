import TimeAgo from "@/components/TimeAgo";
import { prisma } from '@/logic/HandlePrismaClient';
import { Bookmark, normalizeBookmarks } from '@/type/ApiTypes';
import { Container, Stack, Text, Timeline, TimelineItem, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from 'next/link';
import Markdown from 'react-markdown';

interface PageProps {
    params: { locale: string };
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const revalidate = 60; // 秒単位（60秒 = 1分）

export default async function DetailsPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);

    const t = await getTranslations({ locale });

    // searchParams を await してから使う
    const search = await searchParams;
    const uri = typeof search.uri === "string" ? search.uri : undefined;

    const bookmarks = await prisma.bookmark.findMany({
        where: {
            subject: uri
        },
        orderBy: { "indexed_at": 'desc' },
        include: {
            comments: true,
            tags: {
                include: {
                    tag: true,
                },
            },
        },
    })

    const normalized: Bookmark[] = normalizeBookmarks(bookmarks);

    const verifiedBookmarks = normalized.filter((b) =>
        b.tags.includes("Verified")
    );

    const otherBookmarks = normalized.filter((b) =>
        !b.tags.includes("Verified")
    );

    let displayTitle: string | null = null;
    let displayComment: string | null = null;

    if (verifiedBookmarks.length > 0) {
        const v = verifiedBookmarks[0];
        const comment =
            v.comments?.find(c => c.lang === locale) ||
            v.comments?.[0];

        displayTitle = comment?.title || v.ogpTitle;
        displayComment = comment?.comment || v.ogpDescription;
    } else if (otherBookmarks.length > 0) {
        const o = otherBookmarks[0];
        const comment =
            o.comments?.find(c => c.lang === locale) ||
            o.comments?.[0];

        displayTitle = o.ogpTitle || comment?.title 
        displayComment = o.ogpDescription || comment?.comment 
    }


    return (
        <Container size="md" mx="auto" my="sm">
            <Stack gap={4}>
                <Title order={4}>{displayTitle}</Title>
                <Text size="md" component="div"><Markdown
                    components={{
                        p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} />,
                    }}
                >{displayComment}
                </Markdown>
                </Text>
                <Text size="sm" c="dimmed">
                    <Link
                        href={uri || ''}
                        target="_blank"
                        style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            wordBreak: 'break-all',   // 単語途中でも改行
                            overflowWrap: 'anywhere', // 長いURLを折り返す
                        }}
                    >
                        {uri}
                    </Link>
                </Text>
            </Stack>

            <Stack my="md">
                <Timeline bulletSize={20} lineWidth={4} >
                    {otherBookmarks.map((bookmark, idx) => {
                        const comment =
                            bookmark.comments?.find(c => c.lang === locale) ||
                            bookmark.comments?.[0] ||
                            { title: '', comment: '', moderation_result: [] };

                        return (
                            <TimelineItem key={idx}>
                                <Text component="div" c="dimmed">
                                    <Markdown
                                        components={{
                                            p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} />,
                                        }}
                                    >{comment.comment || 'No description available'}</Markdown>
                                </Text>
                                <Text c="dimmed" size="sm">
                                    {"by @" + bookmark.handle} <TimeAgo date={bookmark.indexedAt} />
                                </Text>
                            </TimelineItem>
                        );
                    })}
                </Timeline>
            </Stack>
        </Container>
    );
}
