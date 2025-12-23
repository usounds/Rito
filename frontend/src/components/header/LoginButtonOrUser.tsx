"use client";
import { Authentication } from "@/components/Authentication";
import { resolveHandleViaDoH, resolveHandleViaHttp } from '@/logic/HandleDidredolver';
import { useMyBookmark } from "@/state/MyBookmark";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Bookmark, TagRanking } from '@/type/ApiTypes';
import { SCOPE } from "@/type/OauthConstants";
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import { Affix, Avatar, Button, Menu, Modal, Transition } from "@mantine/core";
import { notifications } from '@mantine/notifications';
import { BookmarkPlus, LogOut, Settings, X } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useEffect, useState } from 'react';
import Link from 'next/link'

type LoginButtonOrUserProps = {
    closeDrawer?: () => void;
};

export function LoginButtonOrUser({ closeDrawer }: LoginButtonOrUserProps) {
    const [loginOpened, setLoginOpened] = useState(false);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const isLoginProcess = useXrpcAgentStore(state => state.isLoginProcess);
    const setIsLoginProcess = useXrpcAgentStore(state => state.setIsLoginProcess);
    const setActiveDid = useXrpcAgentStore(state => state.setActiveDid);
    const setUserProf = useXrpcAgentStore(state => state.setUserProf);
    const setHandle = useXrpcAgentStore(state => state.setHandle);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const handle = useXrpcAgentStore(state => state.handle);
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
    const loader = useTopLoader();
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
    }, [pathname, activeDid, modalSize]);

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

    let duplicate = false

    useEffect(() => {

        if (duplicate) return
        duplicate = true;

        (async () => {
            try {
                setIsLoginProcess(true);
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
                const meRes = await fetch("/api/me", { credentials: "include" })
                if (!meRes.ok) {
                    console.warn("Not authenticated yet");

                    if (handle && !isLoginProcess) {

                        try {

                            try {
                                //　HTTP 解決
                                await resolveHandleViaHttp(handle);
                            } catch (e) {
                                console.warn('HTTP resolve failed, trying DoH:', e);
                                try {
                                    // DoH 解決
                                    await resolveHandleViaDoH(handle);
                                } catch (e2) {
                                    console.error('DoH resolve failed:', e2);
                                    // 両方ダメなら通知出して終了
                                    return;
                                }
                            }

                        } catch {
                            return;
                        }

                        notifications.show({
                            id: 'login-process',
                            title: messages.login.title,
                            message: messages.login.redirect,
                            color: 'blue',
                            loading: true,
                            autoClose: false
                        });

                        const returnTo = window.location.href;
                        const csrf = await fetch("/api/csrf").then(r => r.json());
                        loader.start()
                        const res = await fetch("/api/oauth/login", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                handle,
                                returnTo,
                                csrf: csrf.csrfToken,
                            }),
                        });

                        if (!res.ok) {
                            throw new Error("OAuth login failed");
                        }

                        const { url } = await res.json();
                        window.location.href = url;
                        return

                    } else {
                        setActiveDid(null);
                        setIsLoginProcess(false);
                        return;

                    }
                }
                const meData = await meRes.json();
                const profile = meData.profile
                setUserProf(profile)
                const did = meData.profile.did as ActorIdentifier;
                console.log(`${did} was successfully resumed session.`);
                setIsLoginProcess(false);
                if (!did) return;

                // meData.scope を配列化（空白区切り文字列 → 配列）
                const scopeList = Array.isArray(meData.scope)
                    ? meData.scope
                    : meData.scope.split(/\s+/).filter(Boolean); // 連続空白を除去

                // replacedScope は "include:..." 置き換え済みのスコープ配列
                const replacedScope = SCOPE.flatMap(scope =>
                    scope === "include:blue.rito.permissionSet"
                        ? [
                            "repo?collection=blue.rito.feed.bookmark&collection=blue.rito.feed.like&collection=blue.rito.service.schema",
                            "rpc?lxm=blue.rito.preference.getPreference&lxm=blue.rito.preference.putPreference&aud=*"
                        ]
                        : [scope]
                );

                // すべての必要スコープが含まれているか判定
                const missing = replacedScope.filter(s => !scopeList.includes(s));

                if (missing.length > 0) {
                    notifications.show({
                        title: "Error",
                        message: messages.error.missingscope,
                        color: "red",
                        icon: <X />,
                        autoClose: 5000,
                    });
                }

                setActiveDid(did);

                // ブックマーク取得
                const res = await fetch(`/xrpc/blue.rito.feed.getActorBookmarks?actor=${encodeURIComponent(did)}`);
                if (res.ok) {
                    const data: Bookmark[] = await res.json();
                    setMyBookmark(data);
                }

            } catch (err) {
                console.error("Error initializing user session:", err);
                setActiveDid(null);
            }
        })();
    }, [handle]);
    
    useEffect(() => {
        if (!activeDid) return;

        const fetchBookmarks = async () => {
            const res = await fetch(
                `/xrpc/blue.rito.feed.getActorBookmarks?actor=${encodeURIComponent(activeDid)}`
            );
            if (!res.ok) return;

            const data: Bookmark[] = await res.json();
            setMyBookmark(data);
        };

        fetchBookmarks();
        const id = setInterval(fetchBookmarks, 10_000);

        return () => clearInterval(id);
    }, [activeDid, setMyBookmark]);

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
            setHandle(null)
            setIsLoginProcess(false);
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
                            <Link
                                href={`/${locale}/settings`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <Menu.Item
                                    leftSection={<Settings size={14} />}
                                    onClick={closeDrawer}
                                >
                                    {messages.header.items.settings}
                                </Menu.Item>
                            </Link>
                            <Menu.Divider />
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
