"use client";
import { Center, Loader, Flex, Text } from '@mantine/core';
import { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { ClientMetadata, OAuthUserAgent, configureOAuth, finalizeAuthorization, getSession } from '@atcute/oauth-browser-client';
import { useXrpcAgentStore } from '@/state/XrpcAgent';
import { Client } from '@atcute/client';
import { getClientMetadata } from '@/logic/HandleOauth'

export default function Home() {
    const router = useRouter();
    const setOauthUserAgent = useXrpcAgentStore(state => state.setOauthUserAgent);
    const setAgent = useXrpcAgentStore(state => state.setAgent);
    const addIdentity = useXrpcAgentStore(state => state.addIdentity);
    const setActiveDid = useXrpcAgentStore(state => state.setActiveDid);

    useEffect(() => {
        const processAuthorization = async () => {
            const params = new URLSearchParams(location.hash.slice(1));

            const serverMetadata = getClientMetadata();
            configureOAuth({
                metadata: {
                    client_id: serverMetadata.client_id || '',
                    redirect_uri: serverMetadata.redirect_uris[0] || '',
                },
            });

            if (params.size === 3 || params.size === 4) {
                try {
                    history.replaceState(null, '', location.pathname + location.search);
                    const session = await finalizeAuthorization(params);

                    const agent = new OAuthUserAgent(session);
                    setOauthUserAgent(agent)
                    const rpc = new Client({ handler: agent });
                    setAgent(rpc)

                    console.log(`${agent.sub} was successfully authenticated from ${agent.session.info.server.issuer}.`)
                    const handle = window.localStorage.getItem('oauth.handle') || '/';
                    addIdentity(agent.sub, handle);
                    setActiveDid(agent.sub);

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