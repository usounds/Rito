"use client";
import { Article } from '@/components/bookmarkcard/Article';
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Box, SimpleGrid, Stack, Text } from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';

export function MyBookmark() {
    const client = useXrpcAgentStore(state => state.client);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const messages = useMessages();
    const locale = useLocale();

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
    if (!Array.isArray(myBookmark) || myBookmark.length === 0) {
        return (
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
        );
    }

    return (

        <Stack gap="md">


            <SimpleGrid
                cols={{ base: 1, sm: 2, md: 3 }}
                spacing="md"
            >
                {Array.isArray(myBookmark) && myBookmark.map((b) => (
                    <div key={b.uri}>
                        <Article
                            url={b.subject}
                            title={b.comments[0]?.title ?? ""}
                            comment={b.comments[0]?.comment ?? ""}
                            tags={b.tags}
                            image={b.ogpImage}
                            date={new Date(b.indexedAt)}
                            atUri={b.uri}
                            moderations={[]}
                        />
                    </div>
                ))}
            </SimpleGrid>
        </Stack>
    );

}