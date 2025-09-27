// frontend/app/[locale]/bookmark/details/page.tsx
import { prisma } from '@/logic/HandlePrismaClient';
import { normalizeBookmarks, Bookmark } from '@/type/ApiTypes';
import { Container, Stack, Text, Spoiler, Flex, Title, Tabs, TabsList, TabsPanel, TabsTab, Timeline, TimelineItem, Group } from "@mantine/core";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BlurReveal } from "@/components/BlurReveal";
import Like from "@/components/Like";
import { ModerationBadges } from "@/components/ModerationBadges";
import { TagBadge } from '@/components/TagBadge';
import TimeAgo from "@/components/TimeAgo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import Link from 'next/link';
import Markdown from 'react-markdown';
import { SchemaEditor } from "./SchemaEditor";
import EditMenu from '@/components/EditMenu';
import { Bookmark as BookmarkIcon } from 'lucide-react';
import { Library } from 'lucide-react';
import publicSuffixList from '@/data/publicSuffixList.json';
import type { Metadata } from "next";

interface PageProps {
    params: { locale: string };
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface PostData {
    uri: string;
    text: string;
    moderations: string[];
    indexedAt: Date;
    handle: string | null;
}

interface DisplayData {
    displayTitle: string;
    displayComment: string;
    displayImage?: string;
    domain: string;
    moderations: string[];
    bookmarks: Bookmark[];
    subjectLikes?: string[];
    bookmarksLikes?: Bookmark[];
}

/** 共通：displayTitle / displayComment / moderations を決定 */
export async function getBookmarkDisplayData(uri: string, locale: string): Promise<DisplayData> {
    function withTrailingSlashVariants(uri: string) {
        return uri.endsWith("/")
            ? [uri, uri.slice(0, -1)]
            : [uri, uri + "/"];
    }

    const [uri1, uri2] = withTrailingSlashVariants(uri);

    const bookmarksRaw = await prisma.bookmark.findMany({
        where: {
            OR: [
                { subject: uri1 },
                { subject: uri2 }
            ],
        },
        orderBy: { indexed_at: "desc" },
        include: {
            comments: true,
            tags: { include: { tag: true } },
        },
    });

    const bookmarks = normalizeBookmarks(bookmarksRaw);
    // 1. 対象 subject と末尾スラッシュバリエーションをまとめる
    const targetMap: Record<string, string[]> = {}; // bm.subject -> [対象URIリスト]
    const allTargets: string[] = [];

    for (const bm of bookmarks) {
        const [uri1, uri2] = withTrailingSlashVariants(bm.subject);
        const targets = [uri1, uri2].filter(Boolean);
        targetMap[bm.subject] = targets;
        allTargets.push(...targets);
        allTargets.push(bm.uri);
    }

    // 2. 重複を削除
    const uniqueTargets = Array.from(new Set(allTargets));

    // 3. 一括で Like レコードを取得
    const likes: { subject: string; aturi: string }[] = await prisma.like.findMany({
        where: { subject: { in: uniqueTargets } },
        select: { subject: true, aturi: true },
    });

    // 4. すべての aturi をまとめた配列にする
    const subjectLikes: string[] = likes
        .filter(like => like.subject === uri1 || like.subject === uri2)
        .map(like => like.aturi);


    // 5. bookmarks 配列に bookmarkLikes を埋め込む
    const bookmarksWithLikes = bookmarks.map(bm => {
        const bookmarkLikes = likes
            .filter(like => like.subject === bm.uri) // bm.uri と比較
            .map(like => like.aturi);

        return {
            ...bm,
            likes: bookmarkLikes,
        };
    });

    const verifiedBookmarks = bookmarksWithLikes.filter(b => b.tags.includes("Verified"));
    const otherBookmarks = bookmarksWithLikes.filter(b => !b.tags.includes("Verified"));

    let displayTitle = "";
    let displayComment = "";
    let displayImage = "";
    let moderations: string[] = [];

    if (verifiedBookmarks.length > 0) {
        const v = verifiedBookmarks[0];
        const comment = v.comments?.find(c => c.lang === locale) || v.comments?.[0];
        displayTitle = comment?.title || v.ogpTitle || "";
        displayComment = comment?.comment || v.ogpDescription || "";
        displayImage = v.ogpImage || "";
        moderations = comment?.moderations || v.moderations || [];
    } else if (otherBookmarks.length > 0) {
        const o = otherBookmarks[0];
        const comment = o.comments?.find(c => c.lang === locale) || o.comments?.[0];
        displayTitle = o.ogpTitle || comment?.title || "";
        displayComment = o.ogpDescription || comment?.comment || "";
        displayImage = o.ogpImage || "";
        moderations = o.moderations || comment.moderations || [];
    }

    const domain = (() => {
        try { return new URL(uri || '').hostname; }
        catch { return uri; }
    })();

    if (displayImage && !displayImage.startsWith('https://') && domain) {
        displayImage = `https://${domain}/${displayImage}`;
    }

    return { displayTitle, displayComment, moderations, bookmarks: bookmarksWithLikes, displayImage, domain, subjectLikes };
}

/** OGP 用 generateMetadata */
// export const metadata = { ... } は削除
// 代わりに generateMetadata を使う

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const search = await searchParams;
    const uri = typeof search.uri === "string" ? search.uri : undefined;

    if (!uri) {
        return {
            title: t('detail.error.uriRequired'),
            openGraph: {
                title: t('detail.error.uriRequired'),
                description: t('detail.error.uriRequired'),
                url: `https://rito.blue/${locale}/bookmark/search`,
                type: 'website',
            },
        };
    }

    const { displayTitle, displayComment, displayImage, domain } = await getBookmarkDisplayData(uri, locale);


    return {
        title: t('title') + " - " + displayTitle || t('detail.inform.nobookmark'),
        openGraph: {
            title: t('title') + " - " + displayTitle || t('detail.inform.nobookmark'),
            description: t('detail.original') + ":" + domain + ' | ' + (displayComment || t('detail.inform.nobookmark')),
            url: `https://rito.blue/${locale}/bookmark/details?uri=${encodeURIComponent(uri)}`,
            images: displayImage ? [displayImage] : undefined,
            type: 'website',
        },
    };
}


/** ドメイン情報取得ユーティリティ */
const getNsid = (url: string) => {
    try {
        const host = new URL(url).hostname;
        const parts = host.split(".");
        let suffixIndex = parts.length;
        for (let i = 0; i < parts.length; i++) {
            const candidate = parts.slice(i).join(".");
            if (publicSuffixList.includes(candidate)) {
                suffixIndex = i;
                break;
            }
        }
        const domainParts = parts.slice(Math.max(0, suffixIndex - 1));
        return domainParts.reverse().join(".");
    } catch {
        return url;
    }
};
const getDomain = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
};

export const revalidate = 60;

export default async function DetailsPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale });

    const cookieStore = await cookies();
    const token = cookieStore.get("access_token");
    const isLoggedIn = !!token;

    const search = await searchParams;
    const uri = typeof search.uri === "string" ? search.uri : undefined;
    if (!uri) return <Container><Text c="dimmed">{t('detail.error.uriRequired')}</Text></Container>;

    const { displayTitle, displayComment, moderations, bookmarks, subjectLikes } = await getBookmarkDisplayData(uri, locale);

    if (bookmarks.length === 0) return (
        <Container size="md" mx="auto">
            <Text c="dimmed">{t('detail.inform.nobookmark')}</Text>
        </Container>
    );

    const tags: string[] = Array.from(new Set(bookmarks.flatMap(b => b.tags || [])));
    //const verifiedBookmarks = bookmarks.filter(b => b.tags.includes("Verified"));
    const otherBookmarks = bookmarks.filter(b => !b.tags.includes("Verified"));

    // Post 情報取得
    let postDataArray: PostData[] = [];

    return (
        <Container size="md" mx="auto">
            <Breadcrumbs items={[{ label: t("header.bookmarkMenu"), href: `/${locale}/bookmark/search` }, { label: t("header.details") }]} />
            <Stack gap={4}>
                <BlurReveal moderated={moderations.length > 0} blurAmount={6} overlayText={t('detail.view')}>
                    <Flex justify="space-between" align="center" style={{ width: '100%' }}>
                        <Title order={4}>{displayTitle}</Title>
                        <EditMenu subject={uri} title={displayTitle} tags={tags} />
                    </Flex>
                    <Text size="md" component="div">
                        <Spoiler maxHeight={120} showLabel={t('detail.more')} hideLabel={t('detail.less')}>
                            <Markdown components={{ p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} /> }}>
                                {displayComment}
                            </Markdown>
                        </Spoiler>
                    </Text>
                </BlurReveal>

                <Text size="sm" c="dimmed">
                    <Link href={uri} target="_blank" style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                        {uri}
                    </Link>
                </Text>

                {tags.length > 0 &&
                    <Stack my='xs'>
                        <TagBadge tags={tags} locale={locale} />
                        <ModerationBadges moderations={moderations} />
                    </Stack>
                }

                <Like subject={uri} likedBy={subjectLikes || []} />

            </Stack>

            <Stack my="md">
                <Tabs defaultValue="bookmarks" keepMounted={false}>
                    <TabsList>
                        <TabsTab value="bookmarks" leftSection={<BookmarkIcon size={16} />}>
                            {t('detail.rito')}({otherBookmarks.length})
                        </TabsTab>
                        {/* 
                        <TabsTab value="posts" leftSection={<FaBluesky size={16} />}>
                            {t('detail.bluesky')}({postDataArray.length})
                        </TabsTab> 
                        */}
                        {tags.some(tag => tag.toLowerCase().includes('atprotocol')) &&
                            <TabsTab value="resolver" leftSection={<Library size={16} />}>{t('detail.resolver')}</TabsTab>
                        }
                    </TabsList>

                    <TabsPanel value="bookmarks" pt="xs">
                        <Stack my="md">
                            {otherBookmarks.length === 0 &&
                                <Text c="dimmed">{t('detail.nocomment')}</Text>
                            }
                            <Timeline bulletSize={20} lineWidth={4}>
                                {otherBookmarks.map((bookmark, idx) => {
                                    const comment = bookmark.comments?.find(c => c.lang === locale) || bookmark.comments?.[0] || { title: '', comment: '', moderations: [] };
                                    return (
                                        <TimelineItem key={idx}>
                                            <Text component="div">
                                                <BlurReveal moderated={comment.moderations?.length > 0} blurAmount={6} overlayText={t('detail.view')}>
                                                    {comment.title !== displayTitle && <Text fw={500}>{comment.title}</Text>}
                                                    {comment.comment &&
                                                        <Spoiler maxHeight={120} showLabel={t('detail.more')} hideLabel={t('detail.less')}>
                                                            <Markdown components={{ p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: 'pre-line' }} {...props} /> }}>
                                                                {comment.comment || t('detail.nocomment')}
                                                            </Markdown>
                                                        </Spoiler>
                                                    }
                                                </BlurReveal>
                                            </Text>
                                            <ModerationBadges moderations={comment.moderations} />
                                            <Group align="center" style={{ whiteSpace: 'nowrap' }}>
                                                <Like subject={bookmark.uri} likedBy={bookmark.likes || []} />
                                                <Text c="dimmed" size="sm">
                                                    <Link
                                                        href={`/${locale}/profile/${encodeURIComponent(bookmark.handle || '')}`}
                                                        prefetch={false}
                                                        style={{ textDecoration: 'none', color: 'inherit' }}
                                                    >
                                                        {"by @" + bookmark.handle + " "}
                                                    </Link>

                                                    <TimeAgo date={bookmark.indexedAt} locale={locale} />
                                                </Text>
                                            </Group>

                                        </TimelineItem>
                                    );
                                })}
                            </Timeline>
                        </Stack>
                    </TabsPanel>

                    <TabsPanel value="posts" pt="xs">
                        <Stack my="md">
                            {!isLoggedIn &&
                                <Text c="dimmed">{t('detail.needlogin')}</Text>
                            }
                            {isLoggedIn && postDataArray.length === 0 &&
                                <Text c="dimmed">{t('detail.nocomment')}</Text>
                            }
                            {isLoggedIn && postDataArray.length > 0 &&
                                <Timeline bulletSize={20} lineWidth={4}>
                                    {postDataArray.map((post, idx) => (
                                        <TimelineItem key={idx}>
                                            <Text component="div">
                                                <BlurReveal moderated={post.moderations.length > 0} blurAmount={6} overlayText={t('detail.view')}>
                                                    <Spoiler maxHeight={120} showLabel={t('detail.more')} hideLabel={t('detail.less')}>
                                                        <Markdown components={{ p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: 'pre-line' }} {...props} /> }}>
                                                            {post.text || 'No description available'}
                                                        </Markdown>
                                                    </Spoiler>
                                                </BlurReveal>
                                            </Text>
                                            <ModerationBadges moderations={post.moderations} />
                                            <Text c="dimmed" size="sm">
                                                <Link href={`/${locale}/profile/${encodeURIComponent(post.handle || '')}`} style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                                    {"by @" + post.handle + " "}
                                                </Link>
                                                <TimeAgo date={post.indexedAt} locale={locale} />
                                            </Text>
                                        </TimelineItem>
                                    ))}
                                </Timeline>
                            }
                        </Stack>
                    </TabsPanel>

                    <TabsPanel value="resolver" pt="xs">
                        <SchemaEditor nsid={getNsid(uri)} domain={getDomain(uri)} />
                    </TabsPanel>
                </Tabs>
            </Stack>
        </Container>
    );
}
