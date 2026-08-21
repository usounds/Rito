"use client";
import { useState, useMemo, useEffect } from "react";
import { Article } from '@/components/bookmarkcard/Article';
import { ArticleListItem } from '@/components/bookmarkcard/ArticleListItem';
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import { useMyBookmark } from "@/state/MyBookmark";
import { usePrivateBookmark } from "@/state/PrivateBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Box, SimpleGrid, Stack, Text, TextInput, TagsInput, Alert, Group, ActionIcon, Tooltip, SegmentedControl, Center } from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Globe, Info, LayoutGrid, List, Lock } from 'lucide-react';
import { TagSuggestion } from "@/components/TagSuggest";
import { PrivateBookmarkList } from "@/components/privateBookmark/PrivateBookmarkList";
import classes from '../../bookmark/search/latestbookmark/LatestBookmark.module.scss';

export function MyBookmark() {
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const messages = useMessages();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const isPrivateParam = searchParams ? (searchParams.get("isPrivate") === "true" || searchParams.get("tab") === "private") : false;

    // --- フック ---
    const [currentTab, setCurrentTab] = useState<'public' | 'private'>(isPrivateParam ? 'private' : 'public');
    const [tags, setTags] = useState<string[]>([]);
    const [query, setQuery] = useState<string>("");
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        setCurrentTab(isPrivateParam ? 'private' : 'public');
    }, [isPrivateParam]);

    const handleTabChange = (val: 'public' | 'private') => {
        setCurrentTab(val);
        const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
        if (val === 'private') {
            params.set('isPrivate', 'true');
            params.delete('tab');
        } else {
            params.delete('isPrivate');
            params.delete('tab');
        }
        const queryStr = params.toString();
        const targetPath = queryStr ? `${pathname}?${queryStr}` : pathname;
        router.replace(targetPath, { scroll: false });
    };

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

    // ユーザーのブックマークからタグと件数を集計
    const { allTags, tagCounts } = useMemo(() => {
        if (!Array.isArray(myBookmark)) return { allTags: [], tagCounts: {} };
        const counts: Record<string, number> = {};
        myBookmark.forEach(b => {
            b.tags.forEach((tag: string) => {
                counts[tag] = (counts[tag] || 0) + 1;
            });
        });
        return { allTags: Object.keys(counts), tagCounts: counts };
    }, [myBookmark]);

    const filteredBookmarks = useMemo(() => {
        if (!Array.isArray(myBookmark)) return [];
        return myBookmark.filter((b) => {
            const hasTags = tags.length === 0 || tags.every(tag => b.tags.includes(tag));
            const matchesQuery =
                query.trim() === "" ||
                b.comments.some(c =>
                    c.title.toLowerCase().includes(query.toLowerCase()) ||
                    c.comment.toLowerCase().includes(query.toLowerCase())
                );
            return hasTags && matchesQuery;
        });
    }, [myBookmark, tags, query]);

    const capabilityStatus = usePrivateBookmark(state => state.capabilityStatus);
    const setCapabilityStatus = usePrivateBookmark(state => state.setCapabilityStatus);

    useEffect(() => {
        if (activeDid && capabilityStatus === 'idle') {
            import('@/logic/privateBookmark/pdsClient').then(({ checkSpaceCapability }) => {
                checkSpaceCapability(activeDid).then(res => {
                    setCapabilityStatus(res.status, res.message);
                }).catch(() => {
                    setCapabilityStatus('unsupported');
                });
            });
        }
    }, [activeDid, capabilityStatus, setCapabilityStatus]);

    return (
        <Stack gap="lg">
            {capabilityStatus === 'ready' && (
                <Group justify="flex-start">
                    <SegmentedControl
                        value={currentTab}
                        onChange={(val) => handleTabChange(val as 'public' | 'private')}
                        radius="xl"
                        size="sm"
                        data={[
                            {
                                value: 'public',
                                label: (
                                    <Center style={{ gap: 6, padding: '2px 8px' }}>
                                        <Globe size={15} />
                                        <span style={{ fontWeight: 500 }}>{messages.mybookmark?.tab?.public || '公開'}</span>
                                    </Center>
                                ),
                            },
                            {
                                value: 'private',
                                label: (
                                    <Center style={{ gap: 6, padding: '2px 8px' }}>
                                        <Lock size={15} />
                                        <span style={{ fontWeight: 500 }}>{messages.mybookmark?.tab?.private || '自分のみ'}</span>
                                    </Center>
                                ),
                            },
                        ]}
                    />
                </Group>
            )}

            {currentTab === 'private' ? (
                <PrivateBookmarkList />
            ) : (
                <Stack gap="md">
            <Group justify="space-between" align="flex-end">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" style={{ flex: 1 }}>
                    <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <TagsInput
                            label={messages.search.field.tag.title}
                            placeholder={messages.search.field.tag.placeholder}
                            value={tags}
                            onChange={(newTags) => setTags(newTags.map(tag => tag.replace(/#/g, "")))}
                            styles={{ input: { fontSize: 16 } }}
                            clearable
                        />
                        <TagSuggestion
                            tags={allTags}
                            selectedTags={tags}
                            setTags={setTags}
                            tagCounts={tagCounts}
                        />
                    </Box>
                    <TextInput
                        label={messages.mybookmark.field.search.title}
                        placeholder={messages.mybookmark.field.search.placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.currentTarget.value)}
                        styles={{ input: { fontSize: 16 } }}
                    />
                </SimpleGrid>

                <Group gap={4} mb={4}>
                    <Tooltip label={messages.mybookmark?.viewMode?.grid || 'グリッド表示'}>
                        <ActionIcon
                            variant={viewMode === 'grid' ? 'filled' : 'light'}
                            color="blue"
                            size="lg"
                            onClick={() => handleViewModeChange('grid')}
                            aria-label="Grid view"
                        >
                            <LayoutGrid size={18} />
                        </ActionIcon>
                    </Tooltip>
                    <Tooltip label={messages.mybookmark?.viewMode?.list || 'リスト表示'}>
                        <ActionIcon
                            variant={viewMode === 'list' ? 'filled' : 'light'}
                            color="blue"
                            size="lg"
                            onClick={() => handleViewModeChange('list')}
                            aria-label="List view"
                        >
                            <List size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>

            {!activeDid ? (
                <Box
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '3rem 0',
                    }}
                >
                    <Text>{messages.mybookmark.login}</Text>
                    <LoginButtonOrUser />
                </Box>
            ) : myBookmark.length === 0 ? (
                <Alert my="sm" variant="light" color="blue" title={messages.mybookmark.empty} icon={<Info size={18} />} />
            ) : viewMode === 'grid' ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    {filteredBookmarks.map((b, index) => {
                        const selectedComment = b.comments.find(c => c.lang === locale) || b.comments[0];

                        return (
                            <div key={b.uri} className={classes.articleItem}>
                                <Article
                                    url={b.subject}
                                    title={selectedComment?.title ?? ""}
                                    comment={selectedComment?.comment ?? ""}
                                    tags={b.tags}
                                    image={b.ogpImage}
                                    date={new Date(b.indexedAt)}
                                    moderations={[]}
                                    likes={b.likes || []}
                                    likeDisabled={true}
                                    priority={index < 6}
                                />
                            </div>
                        );
                    })}
                </SimpleGrid>
            ) : (
                <Stack gap="xs">
                    {filteredBookmarks.map((b, index) => {
                        const selectedComment = b.comments.find(c => c.lang === locale) || b.comments[0];

                        return (
                            <ArticleListItem
                                key={b.uri}
                                url={b.subject}
                                title={selectedComment?.title ?? ""}
                                comment={selectedComment?.comment ?? ""}
                                tags={b.tags}
                                image={b.ogpImage}
                                date={new Date(b.indexedAt)}
                                moderations={[]}
                                likes={b.likes || []}
                                likeDisabled={true}
                                priority={index < 6}
                            />
                        );
                    })}
                </Stack>
            )}
                </Stack>
            )}
        </Stack>
    );
}
