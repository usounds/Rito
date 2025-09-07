"use client";
import { Article } from '@/components/bookmarkcard/Article';
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import type { Bookmark } from '@/type/ApiTypes';
import { Box, SimpleGrid, Stack, Text } from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import { useEffect, useState } from 'react';

export function MyBookmark() {
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const client = useXrpcAgentStore(state => state.client);
    const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const messages = useMessages();
    const locale = useLocale();

    useEffect(() => {
        const fetchBookmarks = async () => {
            if (!activeDid) return
            const res = await fetch(`https://api.rito.blue/rpc/get_bookmark?p_did=${encodeURIComponent(activeDid)}`);

            if (!res.ok) {
                setIsLoading(false)
                throw new Error(`Failed to fetch bookmarks: ${res.statusText}`);

            }

            const data: Bookmark[] = await res.json(); // 型を Bookmark[] と指定
            setBookmarks(data)
        };
        fetchBookmarks();
        setIsLoading(false)
    }, [activeDid])

    //未ログイン
    if (!client) return <>
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '80vh',
                gap: '1rem',
            }}
        >
            <Text>{messages.mybookmark.login}</Text>
            <LoginButtonOrUser />
        </Box>
    </>
    if (isLoading) return <>
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '80vh',
                gap: '1rem',
            }}
        >
            {messages.loading}
        </Box></>;
    if (!isLoading && (bookmarks?.length === 0 || !bookmarks)) return <>
        <Box
            style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '80vh',
                gap: '1rem',
            }}
        >
           {messages.mybookmark.empty}
        </Box>
    </>;

    return (

        <Stack gap="md">


            <SimpleGrid
                cols={{ base: 1, sm: 2, md: 3 }}
                spacing="md"
            >
                {bookmarks?.map((b) => {
                    const comment =
                        b.comments.find((c) => c.lang === locale) || b.comments[0];

                    return (
                        <div
                            key={b.uri}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}
                        >
                            <Article
                                url={b.subject}
                                title={comment.title}
                                comment={comment.comment}
                                tags={b.tags}
                                image={b.ogp_image}
                                date={new Date(b.indexed_at)}
                                atUri={b.uri}
                            />
                        </div>
                    );
                })}
            </SimpleGrid>
        </Stack>
    );

}