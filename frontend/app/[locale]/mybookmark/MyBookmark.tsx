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
    if ((myBookmark?.length === 0 || !myBookmark)) return <>
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
                cols={{ base: 1, sm: 2, md: 2 }}
                spacing="md"
            >
                {myBookmark?.map((b) => {
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
                                moderations={comment.moderation_result}
                            />
                        </div>
                    );
                })}
            </SimpleGrid>
        </Stack>
    );

}