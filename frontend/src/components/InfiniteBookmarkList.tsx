'use client';

import { useEffect, useState, useCallback } from 'react';
import { SimpleGrid, Stack, Center, Loader, Text } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { Article } from '@/components/bookmarkcard/Article';
import { BookmarkQuery } from '../../app/[locale]/bookmark/search/latestbookmark/data';
import { fetchBookmarksAction } from '../../app/[locale]/bookmark/search/latestbookmark/actions';
import { Bookmark } from '@/type/ApiTypes';
import classes from '../../app/[locale]/bookmark/search/latestbookmark/LatestBookmark.module.scss';

import { useTranslations } from 'next-intl';

type Props = {
    initialItems: (Bookmark & { likes: string[]; commentCount: number })[];
    initialHasMore: boolean;
    query: BookmarkQuery;
    locale: string;
};

export function InfiniteBookmarkList({ initialItems, initialHasMore, query, locale }: Props) {
    const t = useTranslations('detail.inform');
    const [items, setItems] = useState(initialItems);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [page, setPage] = useState(query.page ?? 1);
    const [loading, setLoading] = useState(false);

    // props が変わった時に state をリセット (レンダリング中の調整)
    const [prevInitialItems, setPrevInitialItems] = useState(initialItems);
    if (initialItems !== prevInitialItems) {
        setItems(initialItems);
        setHasMore(initialHasMore);
        setPage(query.page ?? 1);
        setPrevInitialItems(initialItems);
    }

    const { ref, entry } = useIntersection({
        root: null,
        threshold: 0.1,
    });

    const loadMore = useCallback(async () => {
        setLoading(true);
        const nextPage = page + 1;
        const result = await fetchBookmarksAction({ ...query, page: nextPage });

        setItems((prev) => [...prev, ...result.items]);
        setHasMore(result.hasMore);
        setPage(nextPage);
        setLoading(false);
    }, [page, query]);

    useEffect(() => {
        if (entry?.isIntersecting && hasMore && !loading) {
            const timer = setTimeout(() => loadMore(), 0);
            return () => clearTimeout(timer);
        }
    }, [entry?.isIntersecting, hasMore, loading, loadMore]);

    const useComment = query.comment == null || query.comment === 'comment';

    return (
        <Stack>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {items.map((b, index) => {
                    const comment =
                        b.comments?.find((c) => c.lang === locale) ||
                        b.comments?.[0] || { title: '', comment: '', moderations: [] };

                    const displayTitle = useComment ? comment.title : b.ogpTitle || comment.title || '';
                    const displayComment = useComment ? comment.comment || b.ogpDescription : b.ogpDescription || comment.comment || '';

                    const moderationList: string[] = useComment
                        ? [
                            ...(comment.moderations || []),
                            ...((!comment.title || !comment.comment) ? (b.moderations || []) : []),
                        ]
                        : [
                            ...(b.moderations || []),
                            ...((!b.ogpTitle || !b.ogpDescription) ? (comment.moderations || []) : []),
                        ];

                    const dateField: 'createdAt' | 'indexedAt' = query.sort === 'updated' ? 'indexedAt' : 'createdAt';
                    const displayDate = new Date(b[dateField]);

                    return (
                        <div key={b.uri} ref={index === items.length - 1 ? ref : null} className={classes.articleItem}>
                            <Article
                                url={b.subject}
                                title={displayTitle}
                                handle={b.handle}
                                comment={displayComment || ''}
                                tags={b.tags}
                                image={b.ogpImage}
                                date={displayDate}
                                moderations={moderationList}
                                likes={b.likes || []}
                                bookmarkCount={b.commentCount}
                                priority={index < 6}
                            />
                        </div>
                    );
                })}
            </SimpleGrid>

            {hasMore && (
                <Center py="xl" ref={ref}>
                    <Loader size="sm" />
                </Center>
            )}

            {!hasMore && items.length > 0 && (
                <Center py="xl">
                    <Text size="sm" c="dimmed">{t('noMore')}</Text>
                </Center>
            )}
        </Stack>
    );
}
