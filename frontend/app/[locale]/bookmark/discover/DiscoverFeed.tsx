"use client";

import { Article } from '@/components/bookmarkcard/Article';
import { SimpleGrid } from '@mantine/core';
import { useIntersection } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import { fetchCategoryBookmarks } from '@app/actions/fetchCategoryBookmarks';
import { stripTrackingParams } from '@/logic/stripTrackingParams';
import classes from './Discover.module.scss';

type DiscoverFeedProps = {
    initialBookmarks: any[];
    category: string;
    locale: string;
};

export default function DiscoverFeed({ initialBookmarks, category, locale }: DiscoverFeedProps) {
    const [bookmarks, setBookmarks] = useState<any[]>(initialBookmarks);
    const [page, setPage] = useState(1); // Initial data is page 0
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    // Keep track of Uris to avoid duplication across pages
    const seenUris = useRef(new Set(initialBookmarks.map(b => b.uri)));
    // Also track subjects for URL deduplication logic
    const seenSubjects = useRef(new Set(initialBookmarks.map(b => stripTrackingParams(b.subject.endsWith('/') ? b.subject.slice(0, -1) : b.subject))));

    const { ref, entry } = useIntersection({
        root: null,
        threshold: 1,
    });

    useEffect(() => {
        // Reset state when category changes
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
    }, [entry, hasMore, loading]);

    const loadMore = async () => {
        setLoading(true);
        try {
            const newBookmarks = await fetchCategoryBookmarks(category, page);

            if (newBookmarks.length === 0) {
                setHasMore(false);
                setLoading(false);
                return;
            }

            const uniqueNewBookmarks: any[] = [];
            for (const b of newBookmarks) {
                if (seenUris.current.has(b.uri)) continue;

                const normalizedSubject = stripTrackingParams(b.subject.endsWith('/') ? b.subject.slice(0, -1) : b.subject);
                if (seenSubjects.current.has(normalizedSubject)) continue;

                seenUris.current.add(b.uri);
                seenSubjects.current.add(normalizedSubject);
                uniqueNewBookmarks.push(b);
            }

            setBookmarks(prev => [...prev, ...uniqueNewBookmarks]);
            setPage(prev => prev + 1);

            // If we fetched data but everything was a duplicate, try fetching the next page immediately
            // to avoid getting stuck if 'take' was small vs duplicates.
            // But with take=50, presumably we get *some* new content.
            if (uniqueNewBookmarks.length === 0 && newBookmarks.length > 0) {
                // Option: Trigger another load automatically? 
                // For safety, let's just leave it. The user might need to scroll up and down if the intersection is stuck,
                // but usually we fetched 50 items, surely some are new.
            }

        } catch (error) {
            console.error("Failed to fetch more bookmarks", error);
        } finally {
            setLoading(false);
        }
    };

    const renderArticle = (b: any) => {
        // Copied render logic (simplified or extracted)
        // Since we are in a client component, we need to replicate the renderArticle logic 
        // OR import a component that handles it. 
        // The original renderArticle was a standalone function in page.tsx.
        // Let's create a reusable component or inline the logic here.

        const comment =
            b.comments?.find((c: any) => c.lang === locale) ||
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

        // b.commentCount comes from enrichBookmarks
        const bookmarkCount = b.commentCount || 0;
        // Fix date string serialization issue if passed from server
        const displayDate = new Date(b.createdAt || b.created_at);

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
                    category={b.category}
                    bookmarkCount={bookmarkCount}
                />
            </div>
        );
    };

    return (
        <>
            <div className={classes.articleGrid}>
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm" verticalSpacing="sm">
                    {bookmarks.map((b) => renderArticle(b))}
                </SimpleGrid>
            </div>
            {hasMore && (
                <div ref={ref} className={classes.loadingContainer}>
                    {loading && (
                        <>
                            <div className={classes.loadingDots}>
                                <div className={classes.loadingDot} />
                                <div className={classes.loadingDot} />
                                <div className={classes.loadingDot} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
}
