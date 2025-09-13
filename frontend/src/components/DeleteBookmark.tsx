"use client";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
import { Button, Group, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Check, Trash, X } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useState } from 'react';
import { useMyBookmark } from "@/state/MyBookmark";

type DeleteBookmarkProps = {
    aturi?: string;
    onClose: () => void;
};

export const DeleteBookmark: React.FC<DeleteBookmarkProps> = ({ aturi, onClose }) => {
    const messages = useMessages();
    const client = useXrpcAgentStore(state => state.client);
    const [loading, setLoading] = useState(false);
    const setIsNeedReload = useMyBookmark(state => state.setIsNeedReload);

    const handleDelete = async () => {
        if (!client) return
        if (!aturi) return;
        const parse = parseCanonicalResourceUri(aturi);
        if (!parse.ok) return;

        const { repo, rkey } = parse.value;

        setLoading(true);
        try {
            await client.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: repo,
                    writes: [
                        {
                            $type: 'com.atproto.repo.applyWrites#delete',
                            collection: 'blue.rito.feed.bookmark',
                            rkey: rkey,
                        },
                    ],
                },
            });

            notifications.show({
                title: 'Success',
                message: messages.delete.inform.success,
                color: 'teal',
                icon: <Check />
            });
            setIsNeedReload(true)
            onClose(); // モーダルを閉じる
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: messages.delete.error.error,
                color: 'red',
                icon: <X />
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack>

            {messages.delete.description}


            <Group justify="right">
                <Button variant="default" onClick={onClose}>
                    {messages.delete.button.close}
                </Button>
                <Button color='red' leftSection={<Trash size={16} />} loading={loading} onClick={handleDelete}> {messages.delete.button.delete}</Button>
            </Group>
        </Stack>

    );
};