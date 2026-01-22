'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Stack, Text, Spoiler, Timeline, TimelineItem, Loader, Center } from "@mantine/core";
import { useXrpcAgentStore } from '@/state/XrpcAgent';
import { BlurReveal } from "@/components/BlurReveal";
import { ModerationBadges } from "@/components/ModerationBadges";
import TimeAgo from "@/components/TimeAgo";
import { useTranslations } from 'next-intl';
import { useIntersection } from '@mantine/hooks';

const CONSTELLATION_BASE_URL = "https://constellation.microcosm.blue";
const SLINGSHOT_BASE_URL = "https://slingshot.microcosm.blue";
const MICROCOSM_USER_AGENT = "Rito @rito.blue";
const BATCH_SIZE = 5; // 一度に読み込むレコード数

interface LinkingRecord {
    did: string;
    collection: string;
    rkey: string;
}

interface FacetFeature {
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
}

interface Facet {
    index: { byteStart: number; byteEnd: number };
    features: FacetFeature[];
}

interface PostData {
    uri: string;
    text: string;
    facets?: Facet[];
    moderations: string[];
    indexedAt: Date;
    handle: string | null;
}

/** facetを解析してReact要素の配列に変換 */
function renderTextWithFacets(text: string, facets?: Facet[]): React.ReactNode[] {
    if (!facets || facets.length === 0) {
        return [text];
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const bytes = encoder.encode(text);

    const sortedFacets = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

    const elements: React.ReactNode[] = [];
    let currentBytePos = 0;

    for (const facet of sortedFacets) {
        if (facet.index.byteStart > currentBytePos) {
            const beforeBytes = bytes.slice(currentBytePos, facet.index.byteStart);
            elements.push(decoder.decode(beforeBytes));
        }

        const facetBytes = bytes.slice(facet.index.byteStart, facet.index.byteEnd);
        const facetText = decoder.decode(facetBytes);

        const linkFeature = facet.features.find(f => f.$type === "app.bsky.richtext.facet#link");
        const mentionFeature = facet.features.find(f => f.$type === "app.bsky.richtext.facet#mention");
        const tagFeature = facet.features.find(f => f.$type === "app.bsky.richtext.facet#tag");

        if (linkFeature?.uri) {
            elements.push(
                <a
                    key={`link-${facet.index.byteStart}`}
                    href={linkFeature.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'none' }}
                >
                    {facetText}
                </a>
            );
        } else if (mentionFeature?.did) {
            elements.push(
                <a
                    key={`mention-${facet.index.byteStart}`}
                    href={`https://bsky.app/profile/${mentionFeature.did}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'none' }}
                >
                    {facetText}
                </a>
            );
        } else if (tagFeature?.tag) {
            elements.push(
                <a
                    key={`tag-${facet.index.byteStart}`}
                    href={`https://bsky.app/hashtag/${encodeURIComponent(tagFeature.tag)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--mantine-color-blue-6)', textDecoration: 'none' }}
                >
                    {facetText}
                </a>
            );
        } else {
            elements.push(facetText);
        }

        currentBytePos = facet.index.byteEnd;
    }

    if (currentBytePos < bytes.length) {
        const remainingBytes = bytes.slice(currentBytePos);
        elements.push(decoder.decode(remainingBytes));
    }

    return elements;
}

interface BlueskyPostsTabProps {
    subjectUrl: string;
    locale: string;
}

export function BlueskyPostsTab({ subjectUrl, locale }: BlueskyPostsTabProps) {
    const t = useTranslations();
    const { userProf } = useXrpcAgentStore();
    const isLoggedIn = !!userProf;

    const [posts, setPosts] = useState<PostData[]>([]);
    const [linkingRecords, setLinkingRecords] = useState<LinkingRecord[]>([]);
    const [loadedCount, setLoadedCount] = useState(0);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Infinite scroll用のIntersection Observer
    const { ref: lastItemRef, entry } = useIntersection({
        threshold: 0.1,
    });

    // レコードを1件ずつ取得してすぐに表示
    const fetchSingleRecord = useCallback(async (record: LinkingRecord): Promise<PostData | null> => {
        if (record.collection !== "app.bsky.feed.post") return null;

        try {
            const recordUrl = `${SLINGSHOT_BASE_URL}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(record.did)}&collection=${encodeURIComponent(record.collection)}&rkey=${encodeURIComponent(record.rkey)}`;
            const recordRes = await fetch(recordUrl, {
                headers: {
                    "User-Agent": MICROCOSM_USER_AGENT,
                    "X-User-Agent": MICROCOSM_USER_AGENT
                },
            });

            if (!recordRes.ok) return null;

            const recordData = await recordRes.json();
            const value = recordData.value;

            if (!value || value.$type !== "app.bsky.feed.post") return null;

            return {
                uri: `at://${record.did}/${record.collection}/${record.rkey}`,
                text: value.text || "",
                facets: value.facets || [],
                moderations: [],
                indexedAt: new Date(value.createdAt || Date.now()),
                handle: record.did,
            };
        } catch (e) {
            console.error(`Failed to fetch record for ${record.did}/${record.rkey}:`, e);
            return null;
        }
    }, []);

    // 最初にバックリンクを取得し、最初の数件も併せて取得する
    useEffect(() => {
        async function fetchInitial() {
            if (!isLoggedIn) {
                setInitialLoading(false);
                return;
            }

            try {
                const backlinksUrl = `${CONSTELLATION_BASE_URL}/links?target=${encodeURIComponent(subjectUrl)}&collection=app.bsky.feed.post&path=.embed.external.uri&limit=100`;
                const backlinksRes = await fetch(backlinksUrl, {
                    headers: {
                        "User-Agent": MICROCOSM_USER_AGENT,
                        "X-User-Agent": MICROCOSM_USER_AGENT
                    },
                });

                if (!backlinksRes.ok) {
                    throw new Error(`getBacklinks failed: ${backlinksRes.status}`);
                }

                const backlinksData = await backlinksRes.json();
                const records: LinkingRecord[] = backlinksData.linking_records || [];
                setLinkingRecords(records);

                if (records.length === 0) {
                    setHasMore(false);
                } else {
                    // 最初の2件をまず取得して表示の準備をする（Jumpingを防止）
                    const initialBatchSize = 2;
                    const endIndex = Math.min(initialBatchSize, records.length);
                    const initialPosts: PostData[] = [];

                    for (let i = 0; i < endIndex; i++) {
                        const post = await fetchSingleRecord(records[i]);
                        if (post) initialPosts.push(post);
                    }

                    setPosts(initialPosts);
                    setLoadedCount(endIndex);
                    setHasMore(endIndex < records.length);
                }
            } catch (e) {
                console.error("fetchInitial error:", e);
                setError(e instanceof Error ? e.message : 'Unknown error');
            } finally {
                setInitialLoading(false);
            }
        }

        fetchInitial();
    }, [subjectUrl, isLoggedIn, fetchSingleRecord]);

    // バッチでレコードを読み込む（1件ずつ順番に表示）
    const loadMorePosts = useCallback(async () => {
        if (loadingMore || loadedCount >= linkingRecords.length) {
            setHasMore(false);
            return;
        }

        setLoadingMore(true);
        const endIndex = Math.min(loadedCount + BATCH_SIZE, linkingRecords.length);

        for (let i = loadedCount; i < endIndex; i++) {
            const record = linkingRecords[i];
            const post = await fetchSingleRecord(record);
            if (post) {
                setPosts(prev => [...prev, post]);
            }
        }

        setLoadedCount(endIndex);
        setHasMore(endIndex < linkingRecords.length);
        setLoadingMore(false);
    }, [loadedCount, linkingRecords, loadingMore, fetchSingleRecord]);

    // スクロールで追加読み込み
    useEffect(() => {
        if (entry?.isIntersecting && hasMore && !loadingMore && !initialLoading) {
            loadMorePosts();
        }
    }, [entry?.isIntersecting, hasMore, loadingMore, initialLoading, loadMorePosts]);

    if (!isLoggedIn) {
        return <Text c="dimmed">{t('detail.needlogin')}</Text>;
    }

    if (initialLoading) {
        return (
            <Loader />
        );
    }

    if (error) {
        return <Text c="red">{error}</Text>;
    }

    if (linkingRecords.length === 0) {
        return <Text c="dimmed">{t('detail.nocomment')}</Text>;
    }

    return (
        <Stack>
            <Timeline bulletSize={20} lineWidth={4}>
                {posts.map((post, idx) => (
                    <TimelineItem key={post.uri} ref={idx === posts.length - 1 ? lastItemRef : undefined}>
                        {post.text?.trim() ? (
                            <>
                                <Text component="div">
                                    <BlurReveal moderated={post.moderations.length > 0} blurAmount={6} overlayText={t('detail.view')}>
                                        <Spoiler maxHeight={120} showLabel={t('detail.more')} hideLabel={t('detail.less')}>
                                            <Text style={{ whiteSpace: 'pre-line' }}>
                                                {renderTextWithFacets(post.text, post.facets)}
                                            </Text>
                                        </Spoiler>
                                    </BlurReveal>
                                </Text>
                                <ModerationBadges moderations={post.moderations} />
                            </>
                        ) : null}
                        <Text c="dimmed" size="sm">
                            <a
                                href={`https://bsky.app/profile/${post.handle || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                            >
                                {"by @" + post.handle + " "}
                            </a>
                            <TimeAgo date={post.indexedAt} locale={locale} />
                        </Text>
                    </TimelineItem>
                ))}
            </Timeline>

            {(loadingMore || (hasMore && posts.length < linkingRecords.length)) && (
                <Loader />
            )}
        </Stack>
    );
}
