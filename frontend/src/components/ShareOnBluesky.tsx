"use client";
import { buildPost } from "@/logic/HandleBluesky";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { AppBskyFeedPost } from '@atcute/bluesky';
import { ActorIdentifier, ResourceUri } from '@atcute/lexicons/syntax';
import * as TID from '@atcute/tid';
import { Button, Group, Stack, Textarea, Text, TagsInput, Switch } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, Share, X, Tag } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useState, useMemo } from 'react';

type ShareOnBlueskyProps = {
    subject: string;
    title: string;
    tags?: string[];
    onClose: () => void;
    originalUrl?: string; // Original URL of the article
    image?: string;       // OGP Image URL
    description?: string; // OGP Description
};
const MAX_TOTAL_LENGTH = 300;



export const ShareOnBluesky: React.FC<ShareOnBlueskyProps> = ({ subject, title, tags, onClose, originalUrl, image, description }) => {
    const messages = useMessages();
    const postMessages = [
        messages.share.posta,
        messages.share.postb,
        messages.share.postc,
    ];
    const userProf = useXrpcAgentStore(state => state.userProf);
    const [shareComment, setShareComment] = useState<string>(
        postMessages[Math.floor(Math.random() * postMessages.length)]
    );
    const [tagsLocal, setTags] = useState<string[]>(
        (tags || []).map(tag => tag.replace(/#/g, "").replace(/\s+/g, ""))
    );
    const thisClient = useXrpcAgentStore(state => state.thisClient);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const [loading, setLoading] = useState(false);
    const [isUseOriginalLink, setIsUseOriginalLink] = useState(false);
    const tagsLength = useMemo(() => {
        return tagsLocal.reduce((sum, tag) => sum + 1 + tag.length + 1, 0); // # + tag + 半角スペース
    }, [tagsLocal]);
    const remainingLength = MAX_TOTAL_LENGTH - tagsLength - 10;
    const truncatedComment = shareComment.slice(0, remainingLength); // もし既に超えていたら切り捨て

    const handleShare = async () => {
        if (!thisClient) return

        setLoading(true);
        try {
            const rkeyLocal = TID.now();

            type MyPost = AppBskyFeedPost.Main & {
                via?: string;
            };

            const tagsObj: string[] = tagsLocal
            tagsObj.push('rito.blue')

            const appBskyFeedPost: MyPost = {
                ...(buildPost(shareComment, tagsObj, messages, isUseOriginalLink ? subject : undefined) as Omit<MyPost, "via">),
                via: messages.title
            };

            let ogpMessage = messages.share.ogpdecription
            ogpMessage = ogpMessage.replace("{0}", userProf?.handle ?? "");

            let embedUri = subject as unknown as ResourceUri;
            let embedTitle = messages.title + ' ' + title || messages.title;
            let embedDesc = ogpMessage || '';
            let embedThumbBlob: any = undefined;

            if (isUseOriginalLink) {
                if (originalUrl) {
                    embedUri = originalUrl as unknown as ResourceUri;
                    const host = new URL(originalUrl).hostname;
                    embedTitle = title || host;
                    embedDesc = description || '';

                    // Handle Image Blob Upload
                    if (image) {
                        try {
                            const blobRes = await fetch(`/api/proxyImage?url=${encodeURIComponent(image)}`);
                            if (blobRes.ok) {
                                let blobData = await blobRes.blob();
                                if (blobData.size > 0) {
                                    try {
                                        const { compressImage } = await import('@/logic/ImageCompression');
                                        blobData = await compressImage(blobData);
                                    } catch (compressErr) {
                                        console.error('Compression failed:', compressErr);
                                    }

                                    const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
                                    const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_URL}/xrpc/com.atproto.repo.uploadBlob`, {
                                        method: 'POST',
                                        headers: {
                                            "Content-Type": blobData.type,
                                            "X-CSRF-Token": csrfToken,
                                        },
                                        body: blobData
                                    });

                                    if (uploadRes.ok) {
                                        const uploadData = await uploadRes.json();
                                        if (uploadData && uploadData.blob) {
                                            embedThumbBlob = uploadData.blob;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            console.error("Failed to upload blob", e);
                        }
                    }
                }
            } else {
                // Rito Link (Default) but with Source Citation capability if needed
                // Keeping existing behavior for "Share Rito Link" but matching title format if desired
                // title = messages.title + ' ' + title || messages.title; // Already set above
                // description = ogpMessage; // Already set above
                if (originalUrl) {
                    const host = new URL(originalUrl).hostname;
                    embedTitle = title
                        ? `${messages.create.inform.originalSource} : ${host} - ${title}`
                        : `${messages.create.inform.originalSource} : ${host}`;
                }
            }


            appBskyFeedPost.embed = {
                $type: 'app.bsky.embed.external',
                external: {
                    uri: embedUri,
                    title: embedTitle,
                    description: embedDesc,
                    thumb: embedThumbBlob
                },
            };
            const writes = []

            writes.push({
                $type: "com.atproto.repo.applyWrites#create" as const,
                collection: "app.bsky.feed.post" as `${string}.${string}.${string}`,
                rkey: rkeyLocal,
                value: appBskyFeedPost as unknown as Record<string, unknown>,
            });

            const { csrfToken } = await fetch("/api/csrf").then(r => r.json());
            const ret = await thisClient.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: activeDid as ActorIdentifier,
                    writes: writes
                },
                headers: {
                    "X-CSRF-Token": csrfToken,
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
        } catch {
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
                value={truncatedComment}
                onChange={(event) => {
                    const newValue = event.currentTarget.value;
                    setShareComment(newValue.slice(0, remainingLength)); // 超えた分は切り捨て
                }}
                withAsterisk
                autosize
                maxLength={remainingLength > 0 ? remainingLength : 0} // ← number を渡す
                disabled={loading}
                styles={{ input: { fontSize: 16 } }}
            />
            {originalUrl && (
                <Switch
                    label={messages.create.field.useOriginalLink.title}
                    description={messages.create.field.useOriginalLink.description}
                    checked={isUseOriginalLink}
                    onChange={() => setIsUseOriginalLink(!isUseOriginalLink)}
                    mb="sm"
                />
            )}
            <TagsInput
                data={[]}
                value={tagsLocal}
                onChange={(newTags) => {
                    const cleaned = newTags
                        .map(tag => tag.replace(/#/g, ""))  // # を除去
                        .map(tag => tag.replace(/\s+/g, "")); // 空白をすべて除去
                    setTags(cleaned);
                }}
                label={messages.share.field.tag}
                maxTags={5}
                maxLength={25}
                disabled={!activeDid}
                leftSection={<Tag size={16} />}
                clearable
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