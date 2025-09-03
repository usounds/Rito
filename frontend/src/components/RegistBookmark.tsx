"use client";
import { BlueRitoFeedBookmark } from '@/lexicons';
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import * as TID from '@atcute/tid';
import { Button, Group, Input, Stack, TagsInput, Textarea } from '@mantine/core';
import { useMessages } from "next-intl";
import { useState } from 'react';
import { CgWebsite } from "react-icons/cg";
import { IoMdPricetags } from "react-icons/io";
import { MdOutlineBookmarkAdd } from "react-icons/md";
import { RiVerifiedBadgeLine } from "react-icons/ri";

export const RegistBookmark: React.FC = () => {
    const messages = useMessages();
    const [tags, setTags] = useState<string[]>([]);
    const [title, setTitle] = useState<string>('');
    const [comment, setComment] = useState<string>('');
    const [url, setUrl] = useState<string>('');
    const [isFetchOGP, setIsFetchOGP] = useState(false);
    const [isSubmit, setIsSubmit] = useState(false);
    const [isCanVerify, setIsVerify] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [titleError, setTitleError] = useState<string | null>(null);
    const client = useXrpcAgentStore(state => state.client);
    const oauthUserAgent = useXrpcAgentStore(state => state.oauthUserAgent);
    const identities = useXrpcAgentStore(state => state.identities);
    const [aturi, setAturi] = useState<string>('');
    const [cid, setCid] = useState<string>('');
    const [lang, setLang] = useState<'ja' | 'en'>('ja');

    const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUrl(value);
        setIsVerify(false)

        try {
            // URLが正しいかチェック
            const url = new URL(value)
            const domain = url.hostname
            const identify = identities.find(identity => identity.did === oauthUserAgent?.sub)

            if (url.pathname === '/' || url.pathname === '') {
                if (identify && (domain == identify.handle || domain.endsWith('.' + identify.handle))) {
                    console.log('認証できる')
                    setIsVerify(true)
                }
            }
            setUrlError(null); // 問題なければエラークリア
        } catch {
            setUrlError(messages.create.error.invalidurl); // エラーを表示
        }
    };

    const handleGetOgp = async () => {
        setUrlError('')
        setTitleError('')
        if (!url) {
            setUrlError(messages.create.error.urlMandatory)
            return
        }
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
        setUrlError('')
        setTitleError('')
        if (!url) {
            setUrlError(messages.create.error.urlMandatory)
            return
        }
        if (!title) {
            setTitleError(messages.create.error.titleMandatory)
            return
        }
        setIsSubmit(true)
        const path = window.location.pathname
        const parts = path.split('/').filter(Boolean)
        const lang = parts[0] as 'ja' | 'en'

        const obj: BlueRitoFeedBookmark.Main = {
            $type: "blue.rito.feed.bookmark",
            createdAt: new Date().toISOString(),
            subject: url as `${string}:${string}`,
            titles: [
                {
                    lang: lang,
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
                repo: oauthUserAgent.sub,
                writes: writes
            },
        });

        console.log(ret);

        setIsSubmit(false)
    }

    return (
        <>
            <Stack gap="md">
                <Input.Wrapper label={messages.create.field.url.title} description={isCanVerify ? messages.create.field.url.descriptionForOwner : messages.create.field.url.description} error={urlError}>
                    <Input
                        placeholder={messages.create.field.url.placeholder}
                        value={url} onChange={handleUrlChange}
                        leftSection={isCanVerify && <RiVerifiedBadgeLine size={16} />}
                        styles={{ input: { fontSize: 16, }, }} />
                </Input.Wrapper>
                <Input.Wrapper label={messages.create.field.title.title} description={messages.create.field.title.description} >
                    <Input
                        placeholder={messages.create.field.title.placeholder}
                        value={title}
                        maxLength={50}
                        onChange={(e) => setTitle(e.target.value)}
                        error={titleError}
                        styles={{ input: { fontSize: 16, }, }} />
                </Input.Wrapper>
                <Input.Wrapper label={messages.create.field.comment.title} description={messages.create.field.comment.description} >
                    <Textarea
                        placeholder={messages.create.field.comment.placeholder}
                        value={comment}
                        maxLength={2000}
                        autosize onChange={(e) => setComment(e.target.value)}
                        styles={{ input: { fontSize: 16, }, }} />
                </Input.Wrapper>
                <TagsInput
                    data={[]}
                    value={tags}
                    onChange={setTags}
                    label={messages.create.field.tag.title}
                    description={messages.create.field.tag.description}
                    placeholder={messages.create.field.tag.placeholder}
                    maxTags={10}
                    maxLength={20}
                    leftSection={<IoMdPricetags size={16} />}
                    styles={{ input: { fontSize: 16, }, }} />

                <Group justify="right">
                    <Button leftSection={<CgWebsite size={16} />} variant="default" onClick={handleGetOgp} loading={isFetchOGP} disabled={url.length < 10}>{messages.create.button.ogp}</Button>
                    <Button leftSection={<MdOutlineBookmarkAdd size={16} />} onClick={handleSubmit} loading={isSubmit}>{messages.create.button.regist}</Button>
                    {isCanVerify && <Button leftSection={<RiVerifiedBadgeLine size={16} />} onClick={handleSubmit} loading={isSubmit} variant="light">{messages.create.button.verify}</Button>}
                </Group>
            </Stack>

        </>
    );
};
