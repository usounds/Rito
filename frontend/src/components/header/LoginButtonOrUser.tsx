"use client";
import { Authentication } from "@/components/Authentication";
import { RegistBookmark } from '@/components/RegistBookmark';
import { getClientMetadata } from '@/logic/HandleOauth';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Bookmark } from '@/type/ApiTypes';
import { Client } from '@atcute/client';
import { OAuthUserAgent, configureOAuth, getSession } from '@atcute/oauth-browser-client';
import { Affix, Avatar, Button, Modal } from "@mantine/core";
import { BookmarkPlus } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { useEffect, useState } from 'react';

export function LoginButtonOrUser() {
    const [loginOpened, setLoginOpened] = useState(false);
    const [quickRegistBookmark, setQuickRegistBookmark] = useState(false);
    const client = useXrpcAgentStore(state => state.client);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const setActiveDid = useXrpcAgentStore(state => state.setActiveDid);
    const setOauthUserAgent = useXrpcAgentStore(state => state.setOauthUserAgent);
    const setAgent = useXrpcAgentStore(state => state.setAgent);
    const setUserProf = useXrpcAgentStore(state => state.setUserProf);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const setMyBookmark = useMyBookmark(state => state.setMyBookmark);
    const isNeedReload = useMyBookmark(state => state.isNeedReload);
    const setIsNeedReload = useMyBookmark(state => state.setIsNeedReload);
    const messages = useMessages();
    const locale = useLocale();
    const isLoggedIn = !!client;
    const [modalSize, setModalSize] = useState('70%')

    useEffect(() => {
        const updateSize = () => {
            if (window.innerWidth < 768) {
                setModalSize('100%')
            } else {
                setModalSize('70%')
            }
        }

        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])

    useEffect(() => {
        if (activeDid === null || client != null) {
            return
        }

        (async () => {
            const serverMetadata = getClientMetadata();
            configureOAuth({
                metadata: {
                    client_id: serverMetadata.client_id || '',
                    redirect_uri: `${process.env.NEXT_PUBLIC_URL}/${locale}/callback`,
                },
            });
            const session = await getSession(activeDid as `did:${string}:${string}`, { allowStale: true });

            const agent = new OAuthUserAgent(session);
            setOauthUserAgent(agent);
            const rpc = new Client({ handler: agent });
            setAgent(rpc);
            console.log(`${agent.sub} was successfully resumed session from ${agent.session.info.server.issuer}.`)

            const res = await fetch(`/xrpc/blue.rito.feed.getActorBookmark?actor=${encodeURIComponent(activeDid)}`);

            if (!res.ok) {
                throw new Error(`Failed to fetch bookmarks: ${res.statusText}`);

            }

            //const data: Bookmark[] = await res.json(); // 型を Bookmark[] と指定
            const data = await res.json();

            setMyBookmark(data); // React 側で tags を string[] として使える
            const userProfile = await rpc.get(`app.bsky.actor.getProfile`, {
                params: {
                    actor: agent.sub,
                },
            })
            if (!userProfile.ok) {
                setAgent(null)
                setActiveDid(null)
                return

            }
            setUserProf(userProfile.data);


        })();
    }, [activeDid, client]);

    useEffect(() => {
        if (!isNeedReload || !activeDid) return;

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/xrpc/blue.rito.feed.getActorBookmark?actor=${encodeURIComponent(
                        activeDid
                    )}`
                );

                if (!res.ok) {
                    throw new Error(`Failed to fetch bookmarks: ${res.statusText}`);
                }

                const data: Bookmark[] = await res.json();
                setMyBookmark(data);

                // 再取得が終わったらフラグを false に戻す
                setIsNeedReload(false);
            } catch (err) {
                console.error("Reload failed:", err);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [isNeedReload, activeDid]);

    return (
        <>
            {isLoggedIn && userProf ? (
                // ログイン済みの場合に表示する要素
                <>
                    <Avatar src={userProf.avatar} alt={userProf.displayName || userProf.handle} />
                    <Affix position={{ bottom: 20, right: 20 }} zIndex='5'>
                        <Button
                            onClick={() => setQuickRegistBookmark(true)}
                            leftSection={<BookmarkPlus size={16} />}
                        >
                            {messages.create.title}
                        </Button>
                    </Affix>

                    <Modal
                        opened={quickRegistBookmark}
                        onClose={() => setQuickRegistBookmark(false)}
                        size={modalSize}
                        title={messages.create.title}
                        centered
                    >
                        <RegistBookmark onClose={() => setQuickRegistBookmark(false)}  />
                    </Modal>
                </>

            ) : (
                <>
                    <Button onClick={() => setLoginOpened(true)} variant="default">
                        {messages.login.title}
                    </Button>

                    <Modal
                        opened={loginOpened}
                        onClose={() => setLoginOpened(false)}
                        size="md"
                        title={messages.login.titleDescription}
                        centered
                    >
                        <Authentication />
                    </Modal>
                </>
            )}
        </>
    );
}
