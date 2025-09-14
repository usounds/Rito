import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Title, Text, Stack, Timeline, TimelineItem } from "@mantine/core";
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';
import { prisma } from '@/logic/HandlePrismaClient';
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
import { nsidSchema } from '@/nsid/mapping';
import TimeAgo from "@/components/TimeAgo";
import Markdown from 'react-markdown';
import Link from 'next/link';

interface PageProps {
    params: { locale: string };
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

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
    function getDomain(url: string): string | null {
        if (url.startsWith('https://') || url.startsWith('http://')) {
            try {
                const u = new URL(url);
                return u.hostname; // ドメインのみ返す
            } catch {
                return null;
            }
        } else if (url.startsWith('at://')) {
            const result = parseCanonicalResourceUri(url);
            if (result.ok) {
                const schemaEntry = nsidSchema.find(entry => entry.nsid === result.value.collection);
                if (schemaEntry?.schema) {
                    const newUrl = schemaEntry.schema
                        .replace('{did}', result.value.repo)
                        .replace('{rkey}', result.value.rkey);
                    try {
                        const u = new URL(newUrl);
                        return u.hostname;
                    } catch {
                        return null;
                    }
                }
            }
            // フォールバック
            return `pdsls.dev`;
        }

        return null;
    }


    return (
        <Container size="md" mx="auto" my="sx">
            <Stack gap={4}>
                <Title order={4}>{normalized[0].ogpTitle}</Title>
                <Text size="md" component="div"><Markdown
                    components={{
                        p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} />,
                    }}
                >{normalized[0].ogpDescription}
                </Markdown></Text>
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
                    {normalized.map((bookmark, idx) => {
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
