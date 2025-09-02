"use client";
import { Button, Group, Input, Stack, TagsInput, Textarea } from '@mantine/core';
import { useMessages } from "next-intl";
import { useState } from 'react';
import { BlueRitoFeedBookmark } from '@/lexicons';
import * as TID from '@atcute/tid';
import { useXrpcAgentStore } from "@/state/XrpcAgent";

export const RegistBookmark: React.FC = () => {
    const messages = useMessages();
    const [tags, setTags] = useState<string[]>([]);
    const [title, setTitle] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [url, setUrl] = useState<string>('');
    const [isFetchOGP, setIsFetchOGP] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const client = useXrpcAgentStore(state => state.client);
    const oauthUserAgent = useXrpcAgentStore(state => state.oauthUserAgent);

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUrl(value);

        try {
            // URLが正しいかチェック
            new URL(value);
            setUrlError(null); // 問題なければエラークリア
        } catch {
            setUrlError(messages.create.error.invalidurl); // エラーを表示
        }
    };

    const handleGetOgp = async () => {
        if (!url) return
        setIsFetchOGP(true);

        try {
            const result = await fetch(`/api/fetchOgp?url=${encodeURIComponent(url)}`, {
                method: 'GET',
            });
            if (result.status === 200) {
                const data = await result.json();
                setTitle(data.result?.ogTitle || '');
                setComment(data.result?.ogDescription || '');
            } else {
                console.log('Failed to fetch OGP data');
                setUrlError(messages.create.error.invalidurl);
            }
        } catch {
            setUrlError(messages.create.error.invalidurl);
        }

        setIsFetchOGP(false);
    };

    const handleSubmit = async () => {
        const path = window.location.pathname 
        const parts = path.split('/').filter(Boolean) 
        const lang = parts[0] as 'ja' | 'en' 

        const obj: BlueRitoFeedBookmark.Main = {
            $type: "blue.rito.feed.bookmark",
            createdAt: new Date().toISOString(),
            subject: url as `${string}:${string}`,
            titles: [
                {
                    lang:lang,
                    title: title || '',
                    comment: comment || '',
                }
            ],
            tags: tags.length > 0 ? tags : undefined,
        }
        const rkey = TID.now();
        const writes = []
        writes.push({
            $type: "com.atproto.repo.applyWrites#create" as const,
            collection: "blue.rito.feed.bookmark" as `${string}.${string}.${string}`,
            rkey: rkey,
            value: obj as Record<string, unknown>,
        });

        if (!client || !oauthUserAgent) {
            return
        }

        const ret = await client.post('com.atproto.repo.applyWrites', {
            input: {
                repo: oauthUserAgent?.sub,
                writes: writes
            },
        });

        console.log(ret);
    }

    return (
        <>
            <Stack gap="md">
                <Input.Wrapper label={messages.create.field.url.title} description={messages.create.field.url.description} error={urlError}>
                    <Input placeholder={messages.create.field.url.placeholder} value={url} onChange={handleUrlChange} />
                </Input.Wrapper>
                <Input.Wrapper label={messages.create.field.title.title} description={messages.create.field.title.description} >
                    <Input placeholder={messages.create.field.title.placeholder} value={title} maxLength={50} onChange={(e) => setTitle(e.target.value)} />
                </Input.Wrapper>
                <Input.Wrapper label={messages.create.field.comment.title} description={messages.create.field.comment.description} >
                    <Textarea placeholder={messages.create.field.comment.placeholder} value={comment} maxLength={2000} autosize onChange={(e) => setComment(e.target.value)} />
                </Input.Wrapper>
                <TagsInput
                    data={[]}
                    value={tags}
                    onChange={setTags}
                    label={messages.create.field.tag.title}
                    description={messages.create.field.tag.description}
                    placeholder={messages.create.field.tag.placeholder}
                    maxTags={10}
                    maxLength={20} />

                <Group justify="right">
                    <Button variant="default" onClick={handleGetOgp} loading={isFetchOGP} >{messages.create.button.ogp}</Button>
                    <Button onClick={handleSubmit}>{messages.create.button.regist}</Button>
                </Group>
            </Stack>

        </>
    );
};
