"use client";
import { Center, Loader, Flex, Text } from '@mantine/core';
import { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { ClientMetadata, OAuthUserAgent, configureOAuth, finalizeAuthorization, getSession } from '@atcute/oauth-browser-client';

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const processAuthorization = async () => {
            const params = new URLSearchParams(location.hash.slice(1));

            if (params.size === 3 || params.size === 4) {
                try {
                    history.replaceState(null, '', location.pathname + location.search);
                    const session = await finalizeAuthorization(params);

                } catch (e) {
                    console.log(e);
                }
            }

            const redirectUrl = window.localStorage.getItem('oauth.redirecturl') || '/';

            // ページ遷移
            router.replace(redirectUrl);
        };

        processAuthorization();
    }, []);

    return (
        <Center style={{ width: '100vw', height: '100vh' }}>
            <Flex gap="xl" align="center">
                <Loader color="blue" />
                <Text size="xl">Processing...</Text>
            </Flex>
        </Center>
    );
}