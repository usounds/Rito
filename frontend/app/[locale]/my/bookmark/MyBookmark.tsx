"use client";
import { useState, useMemo } from "react";
import { Article } from '@/components/bookmarkcard/Article';
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Box, SimpleGrid, Stack, Text, TextInput, TagsInput, Alert } from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import { Info } from 'lucide-react';

export function MyBookmark() {
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const messages = useMessages();
    const locale = useLocale();

    // --- フックは必ず最初に ---
    const [tags, setTags] = useState<string[]>([]);
    const [query, setQuery] = useState<string>("");

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
        <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                <TagsInput
                    label={messages.search.field.tag.title}
                    placeholder={messages.search.field.tag.placeholder}
                    value={tags}
                    onChange={(newTags) => setTags(newTags.map(tag => tag.replace(/#/g, "")))}
                    styles={{ input: { fontSize: 16 } }}
                    clearable
                />
                <TextInput
                    label={messages.mybookmark.field.search.title}
                    placeholder={messages.mybookmark.field.search.placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.currentTarget.value)}
                    styles={{ input: { fontSize: 16 } }}
                />
            </SimpleGrid>

            {myBookmark.length === 0 &&
                <Alert my="sm" variant="light" color="blue" title={messages.mybookmark.empty} icon={<Info size={18} />} />
            }

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {filteredBookmarks.map((b) => {
                    // 現在の locale に一致するコメントを優先
                    const selectedComment = b.comments.find(c => c.lang === locale) || b.comments[0];

                    return (
                        <div key={b.uri}>
                            <Article
                                url={b.subject}
                                title={selectedComment?.title ?? ""}
                                comment={selectedComment?.comment ?? ""}
                                tags={b.tags}
                                image={b.ogpImage}
                                date={new Date(b.indexedAt)}
                                atUri={b.uri}
                                moderations={[]}
                                likes={b.likes || []}
                                likeDisabled={true}
                            />
                        </div>
                    );
                })}
            </SimpleGrid>
        </Stack>
    );
}
