"use client";
import { Authentication } from "@/components/Authentication";
import { RegistBookmark } from '@/components/RegistBookmark';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Bookmark } from '@/type/ApiTypes';
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import { Affix, Avatar, Button, Menu, Modal } from "@mantine/core";
import { BookmarkPlus, LogOut } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useEffect, useState } from 'react';

export function LoginButtonOrUser() {
    const [loginOpened, setLoginOpened] = useState(false);
    const [quickRegistBookmark, setQuickRegistBookmark] = useState(false);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const setActiveDid = useXrpcAgentStore(state => state.setActiveDid);
    const setUserProf = useXrpcAgentStore(state => state.setUserProf);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const publicAgent = useXrpcAgentStore(state => state.publicAgent);
    const setMyBookmark = useMyBookmark(state => state.setMyBookmark);
    const isNeedReload = useMyBookmark(state => state.isNeedReload);
    const setIsNeedReload = useMyBookmark(state => state.setIsNeedReload);
    const messages = useMessages();
    const isLoggedIn = !!activeDid;
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
        if(activeDid) return

        (async () => {
            try {
                // まず /api/me から activeDid を取得
                const meRes = await fetch("/api/me");
                if (!meRes.ok) {
                    console.warn("Not authenticated yet");
                    setActiveDid(null);
                    return;
                }
                const meData = await meRes.json();
                const did = meData.did as ActorIdentifier;
                console.log(`${did} was successfully resumed session.`);
                if (!did) return;

                setActiveDid(did);

                // ブックマーク取得
                const res = await fetch(`/xrpc/blue.rito.feed.getActorBookmarks?actor=${encodeURIComponent(did)}`);
                if (res.ok) {
                    const data: Bookmark[] = await res.json();
                    setMyBookmark(data);
                }

                // ユーザープロフィール取得
                const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
                    params: { actor: did },
                });
                if (userProfile.ok) setUserProf(userProfile.data);

            } catch (err) {
                console.error("Error initializing user session:", err);
                setActiveDid(null);
            }
        })();
    }, []);

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
        }, 4000);

        return () => clearTimeout(timer);
    }, [isNeedReload, activeDid]);

    const handleLogout = async () => {
        try {
            // API を叩く
            const res = await fetch("/api/oauth/revoke", { method: "GET" });
            const data = await res.json();

            if (res.ok && data.ok) {
                // ログアウト成功 → フロント側でリダイレクト
            } else {
                console.error("Logout failed:", data);
            }

            setActiveDid(null)
            setUserProf(null)
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    return (
        <>
            {isLoggedIn && userProf ? (
                // ログイン済みの場合に表示する要素
                <>
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <Avatar src={userProf.avatar} alt={userProf.displayName || userProf.handle} size={26} />
                        </Menu.Target>

                        <Menu.Dropdown>
                            <Menu.Label>{messages.header.menu}</Menu.Label>
                            <Menu.Item leftSection={<LogOut size={14} />} color="red" onClick={handleLogout}>{messages.header.items.logout}</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
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
                        <RegistBookmark onClose={() => setQuickRegistBookmark(false)} />
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
