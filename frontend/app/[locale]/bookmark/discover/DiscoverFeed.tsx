"use client";

import { Article } from '@/components/bookmarkcard/Article';
import { ArticleListItem } from '@/components/bookmarkcard/ArticleListItem';
import { SimpleGrid, Stack, Group, ActionIcon, Tooltip } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { fetchCategoryBookmarks } from '@app/actions/fetchCategoryBookmarks';
import { stripTrackingParams } from '@/logic/stripTrackingParams';
import { Bookmark, Comment } from '@/type/ApiTypes';
import classes from './Discover.module.scss';

type DiscoverFeedProps = {
    initialBookmarks: Bookmark[];
    category: string;
    locale: string;
};

export default function DiscoverFeed({ initialBookmarks, category, locale }: DiscoverFeedProps) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
    const [page, setPage] = useState(1); // Initial data is page 0
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const savedMode = localStorage.getItem('rito_bookmark_view_mode') as 'grid' | 'list' | null;
        if (savedMode === 'grid' || savedMode === 'list') {
            setViewMode(savedMode);
        }
    }, []);

    const handleViewModeChange = (mode: 'grid' | 'list') => {
        setViewMode(mode);
        localStorage.setItem('rito_bookmark_view_mode', mode);
    };

    // Keep track of Uris to avoid duplication across pages
    const seenUris = useRef(new Set(initialBookmarks.map(b => b.uri)));
    // Also track subjects for URL deduplication logic
    const seenSubjects = useRef(new Set(initialBookmarks.map(b => stripTrackingParams(b.subject.endsWith('/') ? b.subject.slice(0, -1) : b.subject))));

    const { ref, entry } = useIntersection({
        root: null,
        threshold: 1,
    });

    const loadMore = useCallback(async () => {
        setLoading(true);
        try {
            const newBookmarks = await fetchCategoryBookmarks(category, page);

            if (newBookmarks.length === 0) {
                setHasMore(false);
                setLoading(false);
                return;
            }

            const uniqueNewBookmarks: Bookmark[] = [];
            for (const b of newBookmarks as Bookmark[]) {
                if (seenUris.current.has(b.uri)) continue;

                const normalizedSubject = stripTrackingParams(b.subject.endsWith('/') ? b.subject.slice(0, -1) : b.subject);

                if (seenSubjects.current.has(normalizedSubject)) {
                    setBookmarks(prev => prev.map(existing => {
                        const existingNorm = stripTrackingParams(existing.subject.endsWith('/') ? existing.subject.slice(0, -1) : existing.subject);
                        if (existingNorm === normalizedSubject) {
                            const mergedTags = new Set(existing.tags);
                            if (Array.isArray(b.tags)) {
                                b.tags.forEach((t: string) => mergedTags.add(t));
                            }
                            return {
                                ...existing,
                                tags: Array.from(mergedTags).sort((a: string) => (a === 'Verified' ? -1 : 0))
                            };
                        }
                        return existing;
                    }));

                    seenUris.current.add(b.uri);
                    continue;
                }

                seenUris.current.add(b.uri);
                seenSubjects.current.add(normalizedSubject);
                uniqueNewBookmarks.push(b);
            }

            setBookmarks(prev => [...prev, ...uniqueNewBookmarks]);
            setPage(prev => prev + 1);

        } catch (error) {
            console.error("Failed to fetch more bookmarks", error);
        } finally {
            setLoading(false);
        }
    }, [category, page]);

    useEffect(() => {
        setBookmarks(initialBookmarks);
        setPage(1);
        setHasMore(true);
        seenUris.current = new Set(initialBookmarks.map(b => b.uri));
        seenSubjects.current = new Set(initialBookmarks.map(b => stripTrackingParams(b.subject.endsWith('/') ? b.subject.slice(0, -1) : b.subject)));
    }, [category, initialBookmarks]);

    useEffect(() => {
        if (entry?.isIntersecting && hasMore && !loading) {
            loadMore();
        }
    }, [entry, hasMore, loading, loadMore]);

    const renderArticle = (b: Bookmark, priority: boolean = false) => {
        const comment =
            b.comments?.find((c: Comment) => c.lang === locale) ||
            b.comments?.[0] || { title: '', comment: '', moderations: [] };

        const displayTitle = comment.title || '';
        const displayComment = comment.comment || '';

        const useComment = true;

        const moderationList: string[] = useComment
            ? [
                ...(comment.moderations || []),
                ...((!comment.title || !comment.comment) ? (b.moderations || []) : []),
            ]
            : [
                ...(b.moderations || []),
                ...((!b.ogpTitle || !b.ogpDescription) ? (comment.moderations || []) : []),
            ];

        const bookmarkCount = b.commentCount || 0;
        const displayDate = new Date(b.createdAt || b.created_at || Date.now());

        if (viewMode === 'list') {
            return (
                <ArticleListItem
                    key={b.uri}
                    url={b.subject}
                    title={displayTitle}
                    handle={b.handle}
                    comment={displayComment || ''}
                    tags={b.tags}
                    image={b.ogpImage}
                    date={displayDate}
                    moderations={moderationList}
                    likes={b.likes || []}
                    bookmarkCount={bookmarkCount}
                    priority={priority}
                />
            );
        }

        return (
            <div key={b.uri} className={classes.articleItem}>
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
                    bookmarkCount={bookmarkCount}
                    priority={priority}
                />
            </div>
        );
    };

    return (
        <Stack gap="md">
            <Group justify="flex-end" mt="xs" mb={0}>
                <Group gap={4}>
                    <Tooltip label="カード（グリッド）表示">
                        <ActionIcon
                            variant={viewMode === 'grid' ? 'filled' : 'light'}
                            color="blue"
                            size="md"
                            onClick={() => handleViewModeChange('grid')}
                            aria-label="Grid view"
                        >
                            <LayoutGrid size={16} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label="リスト表示">
                        <ActionIcon
                            variant={viewMode === 'list' ? 'filled' : 'light'}
                            color="blue"
                            size="md"
                            onClick={() => handleViewModeChange('list')}
                            aria-label="List view"
                        >
                            <List size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {viewMode === 'grid' ? (
                <div className={classes.articleGrid}>
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" verticalSpacing="sm">
                        {bookmarks.map((b, index) => renderArticle(b, index < 2))}
                    </SimpleGrid>
                </div>
            ) : (
                <Stack gap="xs">
                    {bookmarks.map((b, index) => renderArticle(b, index < 2))}
                </Stack>
            )}

            {hasMore && (
                <div ref={ref} className={classes.loadingContainer}>
                    {loading && (
                        <div className={classes.loadingDots}>
                            <div className={classes.loadingDot} />
                            <div className={classes.loadingDot} />
                            <div className={classes.loadingDot} />
                        </div>
                    )}
                </div>
            )}
        </Stack>
    );
}
