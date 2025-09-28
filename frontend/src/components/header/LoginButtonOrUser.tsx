"use client";
import { Authentication } from "@/components/Authentication";
import { useMyBookmark } from "@/state/MyBookmark";
import { SCOPE } from "@/logic/HandleOauth";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Bookmark, TagRanking } from '@/type/ApiTypes';
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import { Affix, Avatar, Button, Menu, Modal, Transition } from "@mantine/core";
import { notifications } from '@mantine/notifications';
import { BookmarkPlus, LogOut, X } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function LoginButtonOrUser() {
    const [loginOpened, setLoginOpened] = useState(false);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const setActiveDid = useXrpcAgentStore(state => state.setActiveDid);
    const setUserProf = useXrpcAgentStore(state => state.setUserProf);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const publicAgent = useXrpcAgentStore(state => state.publicAgent);
    const setMyBookmark = useMyBookmark(state => state.setMyBookmark);
    const isNeedReload = useMyBookmark(state => state.isNeedReload);
    const setIsNeedReload = useMyBookmark(state => state.setIsNeedReload);
    const tagRanking = useMyBookmark(state => state.tagRanking);
    const setTagRanking = useMyBookmark(state => state.setTagRanking);
    const messages = useMessages();
    const isLoggedIn = !!activeDid;
    const [modalSize, setModalSize] = useState('70%')
    const router = useRouter();
    const locale = useLocale();
    const pathname = usePathname(); // 現在のパスを取得
    const [isRegist, setIsRegist] = useState(true)

    useEffect(() => {
        // パスに /register が含まれていたら非表示
        if (pathname?.includes('/register')) {
            setIsRegist(false);
            return;
        }

        if (!activeDid) {
            setIsRegist(false);
            return;

        }

        const handleScroll = () => {
            const scrollY = window.scrollY;
            const innerHeight = window.innerHeight;
            const scrollHeight = document.documentElement.scrollHeight;

            // ページがスクロール可能か確認
            const canScroll = scrollHeight > innerHeight;

            if (!canScroll) {
                setIsRegist(true); // スクロールできない場合は常に表示
                return;
            }

            // ページ下から 100px 以内なら非表示
            if (scrollY + innerHeight >= scrollHeight - 100) {
                setIsRegist(false);
            } else {
                setIsRegist(true);
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // 初回チェック

        return () => window.removeEventListener('scroll', handleScroll);
    }, [pathname, activeDid]);

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


        (async () => {
            try {
                if (tagRanking.length === 0) {
                    const res2 = await fetch(`/xrpc/blue.rito.feed.getLatestBookmarkTag`);
                    if (res2.ok) {
                        const data: TagRanking[] = await res2.json();
                        setTagRanking(data);
                    }
                }


                const res3 = await fetch(`/api/status`);
                if (res3.ok) {
                    const data = await res3.json();
                    if (data.diffMinutes !== 0) {
                        // 遅延ありの処理
                        notifications.show({
                            title: 'Error',
                            message: messages.error.delay,
                            color: 'red',
                            icon: <X />,
                            autoClose: 20000, // 20秒
                        });

                    }
                }

                if (activeDid) return

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

                if (meData.scope && !SCOPE.every(s => meData.scope!.includes(s))) {

                    notifications.show({
                        title: 'Error',
                        message: messages.error.missingscope,
                        color: 'red',
                        icon: <X />,
                        autoClose: 5000,
                    });

                }

                setActiveDid(did);

                // ユーザープロフィール取得
                const userProfile = await publicAgent.get(`app.bsky.actor.getProfile`, {
                    params: { actor: did },
                });
                if (userProfile.ok) setUserProf(userProfile.data);

                // ブックマーク取得
                const res = await fetch(`/xrpc/blue.rito.feed.getActorBookmarks?actor=${encodeURIComponent(did)}`);
                if (res.ok) {
                    const data: Bookmark[] = await res.json();
                    setMyBookmark(data);
                }

                // Like取得
                /*
                const like = await fetch(`/xrpc/blue.rito.feed.getActorLikes?actor=${encodeURIComponent(did)}`);
                if (like.ok) {
                    const data = await like.json();
                    console.log(data)
                }
                    */


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
                    `/xrpc/blue.rito.feed.getActorBookmarks?actor=${encodeURIComponent(
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
            <Affix position={{ bottom: 20, right: 20 }}>
                <Transition transition="slide-up" mounted={isRegist}>
                    {(transitionStyles) => (
                        <Button
                            leftSection={<BookmarkPlus size={16} />}
                            style={transitionStyles}
                            onClick={() => router.push(`/${locale}/bookmark/register`)}
                        >
                            {messages.create.title}
                        </Button>
                    )}
                </Transition>
            </Affix>

            {isLoggedIn && userProf ? (
                // ログイン済みの場合に表示する要素
                <>
                    <Menu shadow="md" width={200}>
                        <Menu.Target>
                            <Avatar src={userProf.avatar} alt={userProf.displayName || userProf.handle} size={28} />
                        </Menu.Target>

                        <Menu.Dropdown>
                            <Menu.Label>{messages.header.menu}</Menu.Label>
                            <Menu.Item leftSection={<LogOut size={14} />} color="red" onClick={handleLogout}>{messages.header.items.logout}</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
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
                        closeOnClickOutside={false}
                        centered
                    >
                        <Authentication />
                    </Modal>
                </>
            )}
        </>
    );
}
