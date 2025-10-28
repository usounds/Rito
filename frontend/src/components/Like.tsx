'use client';

import { BlueRitoFeedLike } from '@/lexicons';
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { AppBskyActorDefs } from '@atcute/bluesky';
import { ActorIdentifier } from '@atcute/lexicons/syntax';
import * as TID from '@atcute/tid';
import { ActionIcon, Avatar, Box, HoverCard, Text, Tooltip, Modal } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, Heart, X } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useMemo, useState } from 'react';
import { Authentication } from "@/components/Authentication";

interface LikeButtonProps {
    subject: string; // いいね対象のURI
    likedBy: string[]; // DID の配列 (like レコード URI が入っている)
    actionDisabled?: boolean; // 追加: アクションを無効化するためのプロップ
}

const Like: React.FC<LikeButtonProps> = ({ subject, likedBy, actionDisabled }) => {
    const messages = useMessages();
    const [loginOpened, setLoginOpened] = useState(false);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const [isSubmit, setIsSubmit] = useState(false);
    const thisClient = useXrpcAgentStore(state => state.thisClient);
    const [localLikedBy, setLocalLikedBy] = useState(likedBy);
    const publicAgent = useXrpcAgentStore(state => state.publicAgent);
    const [profiles, setProfiles] = useState<AppBskyActorDefs.ProfileViewDetailed[]>([]);

    // activeDid が likedBy に含まれているかを判定
    const isLiked = useMemo(() => {
        if (!activeDid) return false;
        return localLikedBy.some(uri =>
            uri.startsWith(`at://${activeDid}/blue.rito.feed.like/`)
        );

    }, [activeDid, localLikedBy]);

    const handleSubmit = async () => {
        if (!activeDid) {
            setLoginOpened(true)
            return
        }

        if (actionDisabled) return;
        setIsSubmit(true);

        const id = notifications.show({
            title: 'Process',
            message: messages.detail.inform.process,
            loading: true,
        });

        //新規
        if (!isLiked) {
            const obj: BlueRitoFeedLike.Main = {
                $type: "blue.rito.feed.like",
                createdAt: new Date().toISOString(),
                subject: subject as `${string}:${string}`,
            };

            const rkeyLocal = TID.now();
            const writes = [
                {
                    $type: "com.atproto.repo.applyWrites#create" as const,
                    collection: "blue.rito.feed.like" as `${string}.${string}.${string}`,
                    rkey: rkeyLocal,
                    value: obj as Record<string, unknown>,
                },
            ];

            try {
                const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
                const ret = await thisClient.post('com.atproto.repo.applyWrites', {
                    input: {
                        repo: activeDid as ActorIdentifier,
                        writes: writes,
                    },
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                });

                notifications.hide(id);
                if (ret.ok) {
                    notifications.show({
                        title: 'Success',
                        message: messages.create.inform.success,
                        color: 'teal',
                        icon: <Check />,
                    });

                    setLocalLikedBy(prev => [...prev, `at://${activeDid}/blue.rito.feed.like/${rkeyLocal}`]);

                } else {
                    notifications.show({
                        title: 'Error',
                        message: messages.create.error.unknownError,
                        color: 'red',
                        icon: <X />,
                    });
                }
            } catch {
                notifications.hide(id);
                notifications.show({
                    title: 'Error',
                    message: messages.create.error.unknownError,
                    color: 'red',
                    icon: <X />,
                });
            }
        } else {
            const likeUris = localLikedBy.filter(uri =>
                uri.startsWith(`at://${activeDid}/blue.rito.feed.like/`)
            );

            const writes = likeUris.map(uri => {
                const rkey = uri.split('/').pop(); // rkey 抽出
                return {
                    $type: 'com.atproto.repo.applyWrites#delete' as const,
                    collection: 'blue.rito.feed.like' as const,
                    rkey: rkey!,
                };
            });

            const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
            const ret = await thisClient.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: activeDid as ActorIdentifier,
                    writes,
                },
                headers: {
                    "X-CSRF-Token": csrfToken,
                },
            });
            notifications.hide(id);

            if (ret.ok) {
                notifications.show({
                    title: 'Success',
                    message: messages.delete.inform.success ?? 'Unliked!',
                    color: 'teal',
                    icon: <Check />,
                });

                // likedBy から削除
                setLocalLikedBy(prev =>
                    prev.filter(uri => !uri.startsWith(`at://${activeDid}/blue.rito.feed.like/`))
                );

            } else {
                notifications.hide(id);
                notifications.show({
                    title: 'Error',
                    message: messages.delete.inform.error ?? 'Failed to unlike',
                    color: 'red',
                    icon: <X />,
                });
            }
        }

        setIsSubmit(false);
    };

    const fetchProfiles = async () => {
        // localLikedBy から DID を抽出
        const dids = localLikedBy.map(uri => uri.split('/')[2]); // 'at://did:plc:xxxx/blue.rito.feed.like/xxxx' → 'did:plc:xxxx'

        // 重複を排除して最大5件
        const limitedDids = Array.from(new Set(dids)).slice(0, 5);

        if (limitedDids.length === 0) return

        try {
            const res = await publicAgent.get(`app.bsky.actor.getProfiles`, {
                params: { actors: limitedDids as ActorIdentifier[] },
            });

            if (res.ok && res.data?.profiles) {
                setProfiles(res.data.profiles);
            }
        } catch (err) {
            console.error('Failed to fetch profiles', err);
        }
    };

    return (
        <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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

            <HoverCard>
                <HoverCard.Target>
                    <ActionIcon
                        color="gray"
                        aria-label="Like"
                        onClick={handleSubmit}
                        variant="subtle"
                        disabled={isSubmit || actionDisabled}
                        styles={{
                            root: {
                                '&:disabled': {
                                    opacity: 1,                    // 透過を防ぐ
                                    cursor: 'default',             // 必要に応じて
                                },
                            },
                        }}
                    >
                        <Heart
                            style={{
                                width: '20px',
                                height: '20px',
                                strokeWidth: 1.5,
                                fill: isLiked ? 'red' : 'none', // ここで赤にする
                                stroke: isLiked ? 'red' : 'currentColor',
                            }}
                        />
                    </ActionIcon>
                </HoverCard.Target>
                {!activeDid &&
                    <HoverCard.Dropdown>
                        {messages.detail.inform.needlogin}
                    </HoverCard.Dropdown>
                }
            </HoverCard>

            <HoverCard onOpen={fetchProfiles}>
                <HoverCard.Target>
                    <Text size="sm" c="dimmed">{localLikedBy.length}</Text>
                </HoverCard.Target>
                {localLikedBy.length > 0 &&
                    <HoverCard.Dropdown>
                        <Avatar.Group>
                            {profiles.map((p) => (
                                <Tooltip label={p.displayName + " @" + p.handle} key={p.did}>
                                    <Avatar key={p.did} src={p.avatar}>
                                        {p.displayName?.[0] || '?'}
                                    </Avatar>
                                </Tooltip>
                            ))}
                            {profiles.length > 5 && <Avatar>+{profiles.length - 5}</Avatar>}
                        </Avatar.Group>
                    </HoverCard.Dropdown>
                }
            </HoverCard>
        </Box>
    );
};

export default Like;
