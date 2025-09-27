"use client";
import { buildPost } from "@/logic/HandleBluesky";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { AppBskyFeedPost } from '@atcute/bluesky';
import { ActorIdentifier, ResourceUri } from '@atcute/lexicons/syntax';
import * as TID from '@atcute/tid';
import { Button, Group, Stack, Textarea,Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, Share, X } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useState } from 'react';

type ShareOnBlueskyProps = {
    subject: string;
    title: string;
    onClose: () => void;
};

export const ShareOnBluesky: React.FC<ShareOnBlueskyProps> = ({ subject, title, onClose }) => {
    const messages = useMessages();
    const userProf = useXrpcAgentStore(state => state.userProf);
    const [shareComment, setShareComment] = useState<string>(messages.share.post);
    const thisClient = useXrpcAgentStore(state => state.thisClient);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const [loading, setLoading] = useState(false);
    const handleShare = async () => {
        if (!thisClient) return

        setLoading(true);
        try {
            const rkeyLocal = TID.now();

            type MyPost = AppBskyFeedPost.Main & {
                via?: string;
            };

            const appBskyFeedPost: MyPost = {
                ...(buildPost(shareComment, ['rito.blue'], messages) as Omit<MyPost, "via">),
                via: messages.title
            };


            let ogpMessage = messages.share.ogpdecription

            ogpMessage = ogpMessage.replace("{0}", userProf?.handle ?? "");

            appBskyFeedPost.embed = {
                $type: 'app.bsky.embed.external',
                external: {
                    uri: subject as unknown as ResourceUri,
                    title: messages.title + ' ' + title || messages.title,
                    description: ogpMessage || '',
                },
            };
            const writes = []

            writes.push({
                $type: "com.atproto.repo.applyWrites#create" as const,
                collection: "app.bsky.feed.post" as `${string}.${string}.${string}`,
                rkey: rkeyLocal,
                value: appBskyFeedPost as unknown as Record<string, unknown>,
            });

            const ret = await thisClient.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: activeDid as ActorIdentifier,
                    writes: writes
                },
            });

            if (ret.ok) {
                notifications.show({
                    title: 'Success',
                    message: messages.share.inform.success,
                    color: 'teal',
                    icon: <Check />
                });
            } else {
                notifications.show({
                    title: 'Error',
                    message: messages.share.error.error,
                    color: 'red',
                    icon: <X />
                });
            }
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: messages.share.error.error,
                color: 'red',
                icon: <X />
            });
        } finally {
            onClose(); // モーダルを閉じる
            setLoading(false);
        }
    };

    return (
        <Stack>
            <Text>{messages.share.description}</Text>
            <Textarea
                label={messages.share.field.comment}
                value={shareComment}
                onChange={(event) => setShareComment(event.currentTarget.value)}
                withAsterisk
                autosize
                disabled={loading}
                styles={{ input: { fontSize: 16 } }}
            />
            <Group justify="right">
                <Button variant="default" onClick={onClose}>
                    {messages.share.button.close}
                </Button>
                <Button leftSection={<Share size={16} />} loading={loading} onClick={handleShare}> {messages.share.button.share}</Button>
            </Group>
        </Stack>

    );
};