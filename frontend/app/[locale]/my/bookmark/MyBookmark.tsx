"use client";
import { useState, useMemo, useEffect } from "react";
import { Article } from '@/components/bookmarkcard/Article';
import { ArticleListItem } from '@/components/bookmarkcard/ArticleListItem';
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Box, SimpleGrid, Stack, Text, TextInput, TagsInput, Alert, Group, ActionIcon, Tooltip, Tabs } from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import { Globe, Info, LayoutGrid, List, Lock } from 'lucide-react';
import { TagSuggestion } from "@/components/TagSuggest";
import { PrivateBookmarkList } from "@/components/privateBookmark/PrivateBookmarkList";
import classes from '../../bookmark/search/latestbookmark/LatestBookmark.module.scss';

export function MyBookmark() {
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const messages = useMessages();
    const locale = useLocale();

    // --- フック ---
    const [tags, setTags] = useState<string[]>([]);
    const [query, setQuery] = useState<string>("");
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

    // --- JSX はフックの後で早期 return ---
    if (!activeDid) {
        return (
            <Box
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1rem',
                }}
            >
                <Text>{messages.mybookmark.login}</Text>
                <LoginButtonOrUser />
            </Box>
        );
    }

    return (
        <Tabs defaultValue="public" color="blue" variant="outline">
            <Tabs.List mb="md">
                <Tabs.Tab value="public" leftSection={<Globe size={16} />}>
                    公開ブックマーク
                </Tabs.Tab>
                <Tabs.Tab value="private" leftSection={<Lock size={16} />} color="violet">
                    プライベート
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="public">
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
                    <Tooltip label="グリッド表示">
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
                    <Tooltip label="リスト表示">
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

            {myBookmark.length === 0 &&
                <Alert my="sm" variant="light" color="blue" title={messages.mybookmark.empty} icon={<Info size={18} />} />
            }

            {viewMode === 'grid' ? (
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
            </Tabs.Panel>

            <Tabs.Panel value="private">
                <PrivateBookmarkList />
            </Tabs.Panel>
        </Tabs>
    );
}
