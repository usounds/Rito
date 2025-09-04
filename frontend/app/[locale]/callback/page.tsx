"use client";
import { getClientMetadata } from '@/logic/HandleOauth';
import { useXrpcAgentStore } from '@/state/XrpcAgent';
import { Client } from '@atcute/client';
import { OAuthUserAgent, configureOAuth, finalizeAuthorization } from '@atcute/oauth-browser-client';
import { Center, Flex, Loader, Text } from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from "react";

export default function Home() {
    const router = useRouter();
    const setOauthUserAgent = useXrpcAgentStore(state => state.setOauthUserAgent);
    const setAgent = useXrpcAgentStore(state => state.setAgent);
    const addIdentity = useXrpcAgentStore(state => state.addIdentity);
    const setActiveDid = useXrpcAgentStore(state => state.setActiveDid);
    const setUserProf = useXrpcAgentStore(state => state.setUserProf);
    const messages = useMessages();
    const locale = useLocale();

    useEffect(() => {
        const processAuthorization = async () => {
            const params = new URLSearchParams(location.hash.slice(1));

            const serverMetadata = getClientMetadata();
            configureOAuth({
                metadata: {
                    client_id: serverMetadata.client_id || '',
                    redirect_uri: `${process.env.NEXT_PUBLIC_URL}/${locale}/callback`,
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

                    const userProfile = await rpc.get(`app.bsky.actor.getProfile`, {
                        params: {
                            actor: agent.sub,
                        },
                    })
                    if (!userProfile.ok) {
                        return { success: false, message: 'System Error : Cannot get userProfile:' + agent.sub }

                    }

                    setUserProf(userProfile.data);

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
                <Text size="md">{messages.callback.description}</Text>
            </Flex>
        </Center>
    );
}