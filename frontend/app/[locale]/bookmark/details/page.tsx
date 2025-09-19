import TimeAgo from "@/components/TimeAgo";
import { SchemaEditor } from "./SchemaEditor";
import { BlurReveal } from "@/components/BlurReveal"
import { prisma } from '@/logic/HandlePrismaClient';
import { Bookmark, normalizeBookmarks } from '@/type/ApiTypes';
import { Container, Stack, Text, Timeline, TimelineItem, Title } from "@mantine/core";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from 'next/link';
import Markdown from 'react-markdown';
import { Spoiler } from '@mantine/core';
import { Tabs, TabsList, TabsTab, TabsPanel } from '@mantine/core';
import { cookies } from "next/headers";
import { TagBadge } from '@/components/TagBadge';
import publicSuffixList from '@/data/publicSuffixList.json';
import Breadcrumbs from "@/components/Breadcrumbs"
import { ModerationBadges } from "@/components/ModerationBadges";
import type { Metadata } from "next";

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
};

interface PageProps {
    params: { locale: string };
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface PostData {
    uri: string;            // PostUri の uri
    text: string;           // Post の text
    moderations: string[];   // Post の moderation_result をカンマ区切りで配列化
    indexedAt: Date;        // Post の indexed_at
    handle: string | null;  // Post の handle
}

const getNsid = (url: string) => {
    try {
        const host = new URL(url).hostname;
        const parts = host.split(".");
        const len = parts.length;

        // Public Suffix List にマッチする最長サフィックスを探す
        let suffixIndex = len;
        for (let i = 0; i < len; i++) {
            const candidate = parts.slice(i).join(".");
            if (publicSuffixList.includes(candidate)) {
                suffixIndex = i;
                break;
            }
        }

        if (suffixIndex === 0) return host; // 見つからなければそのまま

        // 直前の部分を含める → 2階層 or 3階層に
        const domainParts = parts.slice(Math.max(0, suffixIndex - 1));

        // ドット区切りを逆順にする（TLDを先頭に）
        return domainParts.reverse().join(".");
    } catch {
        return url;
    }
};

const getDomain = (url: string) => {
    try {
        const host = new URL(url).hostname;
        return host;
    } catch {
        return url;
    }
};

export const revalidate = 60; // 秒単位（60秒 = 1分）

export default async function DetailsPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token");
    const isLoggedIn = !!token;

    // searchParams を await してから使う
    const search = await searchParams;
    const uri = typeof search.uri === "string" ? search.uri : undefined;
    if (!uri) return <>{t('detail.error.uriRequired')}</>

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

    const tags: string[] = normalized.flatMap(b => b.tags || []);

    const verifiedBookmarks = normalized.filter((b) =>
        b.tags.includes("Verified")
    );

    const otherBookmarks = normalized.filter((b) =>
        !b.tags.includes("Verified")
    );

    let displayTitle: string | null = null;
    let displayComment: string | null = null;
    let moderations: string[] = [];

    if (verifiedBookmarks.length > 0) {
        const v = verifiedBookmarks[0];
        const comment =
            v.comments?.find(c => c.lang === locale) ||
            v.comments?.[0];

        if (comment) {
            // comment を優先して displayTitle / displayComment をセット
            displayTitle = comment.title || v.ogpTitle || "";
            displayComment = comment.comment || v.ogpDescription || "";

            const commentModerations = comment.moderations ?? [];
            const vModerations = v.moderations ?? [];

            // comment が不足して OGP で補った場合は両方合算
            moderations =
                (displayTitle === comment.title && displayComment === comment.comment)
                    ? commentModerations
                    : Array.from(new Set([...vModerations, ...commentModerations]));
        } else {
            displayTitle = v.ogpTitle || "";
            displayComment = v.ogpDescription || "";
            moderations = v.moderations ?? [];
        }
    } else if (otherBookmarks.length > 0) {
        const o = otherBookmarks[0];
        const comment =
            o.comments?.find(c => c.lang === locale) ||
            o.comments?.[0];

        if (comment) {
            // displayTitle / displayComment の優先順：OGP -> comment
            displayTitle = o.ogpTitle || comment.title || "";
            displayComment = o.ogpDescription || comment.comment || "";

            // moderations の合算
            const commentModerations = comment.moderations ?? [];
            const oModerations = o.moderations ?? [];
            // display が OGP 由来なら oModerations のみ、comment 由来なら両方
            moderations =
                displayTitle === o.ogpTitle && displayComment === o.ogpDescription
                    ? oModerations
                    : Array.from(new Set([...oModerations, ...commentModerations]));
        } else {
            displayTitle = o.ogpTitle || "";
            displayComment = o.ogpDescription || "";
            moderations = o.moderations ?? [];
        }
    }

    console.log(JSON.stringify(otherBookmarks))

    //投稿
    // 指定した URL から Post と PostUri 情報を取得
    let postDataArray: PostData[] = []
    if (isLoggedIn) {
        const postUriRecord = await prisma.postUri.findFirst({
            where: {
                uri: {
                    equals: uri,
                    mode: "insensitive",
                },
            },
            include: {
                post: {
                    include: {
                        uris: true, // ここで Post.uris を include
                    },
                },
            },
        });

        if (!postUriRecord || !postUriRecord.post) {
            // console.log("Post not found for this URL");
        } else {
            const post = postUriRecord.post;

            // PostData[] 作成
            if (!post) {
                //const postDataArray: PostData[] = [];
            } else {
                const firstUri = post.uris[0]?.uri || ''; // 先頭の URL
                postDataArray = [{
                    uri: firstUri,
                    text: post.text,
                    moderations: post.moderation_result ? post.moderation_result.split(',') : [],
                    indexedAt: post.indexed_at,
                    handle: post.handle,
                }];

            }
        }
    }

    return (
        <>
            <Container size="md" mx="auto">
                <Breadcrumbs items={[{ label: t("header.bookmarkMenu") }, { label: t("header.details") }]} />
                <Stack gap={4}>
                    <BlurReveal
                        moderated={moderations.length > 0}
                        blurAmount={6}
                        overlayText={t('detail.view')}
                    >
                        <Title order={4}>{displayTitle}</Title>
                        <Text size="md" component="div">
                            <Spoiler maxHeight={120} showLabel={t('detail.more')} hideLabel={t('detail.less')} >
                                <Markdown
                                    components={{
                                        p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} />,
                                    }}
                                >{displayComment}
                                </Markdown>
                            </Spoiler>
                        </Text>
                    </BlurReveal>

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
                    {tags &&
                        <Stack my='xs'>
                            <TagBadge tags={tags} />
                            <ModerationBadges moderations={moderations} />
                        </Stack>
                    }
                </Stack>

                <Stack my="md">
                    <Tabs defaultValue="bookmarks" keepMounted={false}>
                        <TabsList>
                            <TabsTab value="bookmarks">{t('detail.rito')}</TabsTab>
                            <TabsTab value="posts">{t('detail.bluesky')}</TabsTab>
                            {tags.some(tag => tag.toLowerCase().includes('atprotocol'.toLowerCase())) && (
                                <TabsTab value="resolver">{t('detail.resolver')}</TabsTab>
                            )}
                        </TabsList>

                        <TabsPanel value="bookmarks" pt="xs">
                            <Stack my="md">

                                {otherBookmarks.length === 0 &&
                                    <Text c="dimmed">{t('detail.nocomment')}</Text>
                                }
                                <Timeline bulletSize={20} lineWidth={4}>
                                    {otherBookmarks.map((bookmark, idx) => {
                                        const comment =
                                            bookmark.comments?.find((c) => c.lang === locale) ||
                                            bookmark.comments?.[0] ||
                                            { title: '', comment: '', moderation_result: [] };
                                        return (
                                            <TimelineItem key={idx}>
                                                <Text component="div" c="dimmed">
                                                    <BlurReveal
                                                        moderated={Array.isArray(comment.moderations) && comment.moderations.length > 0}
                                                        blurAmount={6}
                                                        overlayText={t('detail.view')}
                                                    >
                                                        <Spoiler maxHeight={120} showLabel={t('detail.more')} hideLabel={t('detail.less')}>
                                                            <Markdown
                                                                components={{
                                                                    p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: 'pre-line' }} {...props} />,
                                                                }}
                                                            >
                                                                {comment.comment || t('detail.nocomment')}
                                                            </Markdown>
                                                        </Spoiler>
                                                    </BlurReveal>
                                                </Text>

                                                <ModerationBadges moderations={comment.moderations} />
                                                <Text c="dimmed" size="sm">
                                                    <Link href={`/${locale}/profile/${encodeURIComponent(bookmark.handle || '')}`}
                                                        prefetch={false}
                                                        style={{
                                                            textDecoration: 'none',
                                                            color: 'inherit',
                                                            wordBreak: 'break-all',   // 単語途中でも改行
                                                            overflowWrap: 'anywhere', // 長いURLを折り返す
                                                        }} >
                                                        {"by @" + bookmark.handle} <TimeAgo date={bookmark.indexedAt} />

                                                    </Link>
                                                </Text>
                                            </TimelineItem>
                                        );
                                    })}

                                </Timeline>
                            </Stack>
                        </TabsPanel>

                        <TabsPanel value="posts" pt="xs">
                            <Stack my="md">
                                {postDataArray.length === 0 &&
                                    <Text c="dimmed">{t('detail.nocomment')}</Text>
                                }
                                <Timeline bulletSize={20} lineWidth={4}>
                                    {postDataArray.map((post, idx) => (
                                        <TimelineItem key={idx}>
                                            <Text component="div" c="dimmed">
                                                <BlurReveal
                                                    moderated={Array.isArray(post.moderations) && post.moderations.length > 0}
                                                    blurAmount={6}
                                                    overlayText={t('detail.view')}
                                                >
                                                    <Spoiler maxHeight={120} showLabel={t('detail.more')} hideLabel={t('detail.less')}>
                                                        <Markdown
                                                            components={{
                                                                p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: 'pre-line' }} {...props} />,
                                                            }}
                                                        >
                                                            {post.text || 'No description available'}
                                                        </Markdown>
                                                    </Spoiler>
                                                </BlurReveal>
                                            </Text>

                                            <ModerationBadges moderations={post.moderations} />
                                            <Text c="dimmed" size="sm">
                                                <Link href={`/${locale}/profile/${encodeURIComponent(post.handle || '')}`} style={{
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    wordBreak: 'break-all',   // 単語途中でも改行
                                                    overflowWrap: 'anywhere', // 長いURLを折り返す
                                                }}>
                                                    {"by @" + post.handle}
                                                </Link>
                                                <TimeAgo date={post.indexedAt} />
                                            </Text>
                                        </TimelineItem>
                                    ))}
                                </Timeline>
                            </Stack>
                        </TabsPanel>

                        <TabsPanel value="resolver" pt="xs">
                            <SchemaEditor nsid={getNsid(uri || '')} domain={getDomain(uri || '')} />
                        </TabsPanel>
                    </Tabs>
                </Stack>
            </Container>
        </>
    );
}
