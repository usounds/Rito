"use client";
import { BlueRitoFeedBookmark } from '@/lexicons';
import { nsidSchema } from "@/nsid/mapping";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { Bookmark } from "@/type/ApiTypes";
import { isResourceUri, parseCanonicalResourceUri, ParsedCanonicalResourceUri } from '@atcute/lexicons/syntax';
import * as TID from '@atcute/tid';
import { Button, Group, Stack, TagsInput, Textarea, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { BadgeCheck, BookmarkPlus, Check, PanelsTopLeft, Tag, X } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { useEffect, useState } from 'react';

type RegistBookmarkProps = {
    aturi?: string;
};

export const RegistBookmark: React.FC<RegistBookmarkProps> = ({ aturi }) => {
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
    const [ogpTitle, setOgpTitle] = useState<string | null>(null);
    const [ogpDescription, setOgpDescription] = useState<string | null>(null);
    const [ogpImage, setOgpImage] = useState<string | null>(null);
    const [aturiParsed, setAturiParsed] = useState<ParsedCanonicalResourceUri | null>(null);
    const [rkey, setRkey] = useState<string | null>(null);
    const [schema, setSchema] = useState<string | null>(null);
    const client = useXrpcAgentStore(state => state.client);
    const oauthUserAgent = useXrpcAgentStore(state => state.oauthUserAgent);
    const identities = useXrpcAgentStore(state => state.identities);
    const locale = useLocale();

    useEffect(() => {
        const fetchBookmark = async () => {
            if (!aturi) return
            try {
                const res = await fetch(
                    `https://api.rito.blue/rpc/get_bookmark_details?p_uri=${encodeURIComponent(aturi)}`
                );

                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }

                const data = await res.json() as Bookmark[]

                // API の戻り値は配列 ([]) なので最初の要素を取り出す
                if (Array.isArray(data) && data.length > 0) {
                    setTags(data[0].tags);
                    setUrl(data[0].subject);
                    const matchedComment = data[0].comments.find((c: { lang: string }) => c.lang === locale);
                    setTitle(matchedComment?.title || '')
                    setComment(matchedComment?.comment || '')
                    const parse = parseCanonicalResourceUri(aturi)
                    if (parse.ok) setRkey(parse.value.rkey)

                } else {
                    //setBookmark(null);
                }
            } catch (err) {
                console.error(err);
                //setBookmark(null);
            } finally {
                //setLoading(false);
            }
        };

        fetchBookmark();
    }, [aturi]);

    const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const value = e.target.value;
        setUrl(value);
        setIsVerify(false)
        setUrlError(null);
        setSchema(null);

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
        } catch {
            if (isResourceUri(value)) {
                const result = parseCanonicalResourceUri(value);

                if (result.ok) {
                    setAturiParsed(result.value);
                    const schemaEntry = nsidSchema.find(entry => entry.nsid === result.value.collection);
                    const schema = schemaEntry?.schema ?? null;
                    setSchema(schema);
                } else {
                    setAturiParsed(null);
                    setSchema(null)
                }

            } else {
                setUrlError(messages.create.error.invalidurl); // エラーを表示

            }
        }
    };

    const handleGetOgp = async () => {
        setUrlError('')
        setTitleError('')

        let ogpUrl = url
        if (schema && aturiParsed) {
            ogpUrl = schema.replace('{did}', aturiParsed.repo).replace('{rkey}', aturiParsed.rkey)
        }
        if (!url) {
            setUrlError(messages.create.error.urlMandatory)
            return
        }
        setIsFetchOGP(true);

        try {
            const result = await fetch(`/api/fetchOgp?url=${encodeURIComponent(ogpUrl)}`, {
                method: 'GET',
            });
            if (result.status === 200) {
                const data = await result.json();
                setTitle(data.result?.ogTitle || '');
                setComment(data.result?.ogDescription || '');
                setOgpTitle(data.result?.ogTitle || '');
                setOgpDescription(data.result?.ogDescription || '');
                setOgpImage(data.result?.ogImage?.[0]?.url || '')
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
        if (url.startsWith('https://')) {
            const urlLocal = new URL(url)
            const domain = urlLocal.hostname
            const res = await fetch(`/api/checkDomain?d=${encodeURIComponent(domain)}`)
            const data = await res.json() as { result: boolean }
            if (data.result) {
                setUrlError(messages.create.error.blockUrl)
                return

            }

        }
        setIsSubmit(true)
        const lang = locale as 'ja' | 'en'

        let ogpTitleLocal = ogpTitle
        let ogpDescriptionLocal = ogpDescription
        let ogpImageLocal = ogpImage

        if (ogpTitleLocal) {
            let ogpUrl = url
            if (schema && aturiParsed) {
                ogpUrl = schema.replace('{did}', aturiParsed.repo).replace('{rkey}', aturiParsed.rkey)
            }
            if (!url) {
                setUrlError(messages.create.error.urlMandatory)
                return
            }
            try {
                const result = await fetch(`/api/fetchOgp?url=${encodeURIComponent(ogpUrl)}`, {
                    method: 'GET',
                });
                if (result.status === 200) {
                    const data = await result.json();
                    ogpTitleLocal = data.result?.ogTitle || '';
                    ogpDescriptionLocal = data.result?.ogDescription || '';
                    ogpImageLocal = data.result?.ogImage?.[0]?.url || ''
                } else {
                    console.log('Failed to fetch OGP data');
                    setUrlError(messages.create.error.invalidurl);
                }
            } catch {
                setUrlError(messages.create.error.invalidurl);
            }
        }

        const obj: BlueRitoFeedBookmark.Main = {
            $type: "blue.rito.feed.bookmark",
            createdAt: new Date().toISOString(),
            subject: url as `${string}:${string}`,
            comments: [
                {
                    lang: lang,
                    title: title || '',
                    comment: comment || ''
                }
            ],
            tags: tags.length > 0 ? tags : undefined,
            ogpTitle: ogpTitleLocal || '',
            ogpDescription: ogpDescriptionLocal || '',
            ogpImage: (ogpImageLocal || '') as `${string}:${string}`
        }
        let rkeyLocal
        const writes = []

        if (rkey) {
            rkeyLocal = rkey
            writes.push({
                $type: "com.atproto.repo.applyWrites#update" as const,
                collection: "blue.rito.feed.bookmark" as `${string}.${string}.${string}`,
                rkey: rkeyLocal,
                value: obj as Record<string, unknown>,
            });
        } else {
            rkeyLocal = TID.now();
            writes.push({
                $type: "com.atproto.repo.applyWrites#create" as const,
                collection: "blue.rito.feed.bookmark" as `${string}.${string}.${string}`,
                rkey: rkeyLocal,
                value: obj as Record<string, unknown>,
            });

        }

        if (!client || !oauthUserAgent) {
            return
        }

        const ret = await client.post('com.atproto.repo.applyWrites', {
            input: {
                repo: oauthUserAgent.sub,
                writes: writes
            },
        });

        if (ret.ok) {
            setRkey(rkeyLocal)
            notifications.show({
                title: 'Success',
                message: messages.create.inform.success,
                color: 'teal',
                icon: <Check />
            });
        } else {
            notifications.show({
                title: 'Error',
                message: messages.create.error.unknownError,
                color: 'red',
                icon: <X />
            });

        }

        setIsSubmit(false)
    }

    return (
        <>
            <Stack gap="md">
                <TextInput
                    label={messages.create.field.url.title}
                    description={isCanVerify ? messages.create.field.url.descriptionForOwner : messages.create.field.url.description}
                    placeholder={messages.create.field.url.placeholder}
                    value={url} onChange={handleUrlChange}
                    leftSection={isCanVerify && <BadgeCheck size={16} />}
                    withAsterisk
                    error={urlError}
                    styles={{ input: { fontSize: 16, }, }} />
                <Group justify="center">
                    <Button
                        leftSection={<PanelsTopLeft size={16} />}
                        variant="default"
                        onClick={handleGetOgp}
                        loading={isFetchOGP}
                        style={{ width: "auto" }}
                        disabled={
                            !url.startsWith('https://') &&
                            !schema == null
                        }
                    >
                        {messages.create.button.ogp}
                    </Button>
                </Group>
                <TextInput
                    label={messages.create.field.title.title}
                    placeholder={messages.create.field.title.placeholder}
                    description={messages.create.field.title.description}
                    value={title}
                    maxLength={50}
                    onChange={(e) => setTitle(e.target.value)}
                    error={titleError}
                    withAsterisk
                    styles={{ input: { fontSize: 16, }, }} />
                <Textarea
                    label={messages.create.field.comment.title}
                    description={messages.create.field.comment.description}
                    placeholder={messages.create.field.comment.placeholder}
                    value={comment}
                    maxLength={2000}
                    autosize
                    onChange={(e) => setComment(e.target.value)}
                    styles={{ input: { fontSize: 16, }, }} />
                <TagsInput
                    data={[]}
                    value={tags}
                    onChange={setTags}
                    label={messages.create.field.tag.title}
                    description={messages.create.field.tag.description}
                    placeholder={messages.create.field.tag.placeholder}
                    maxTags={10}
                    maxLength={20}
                    leftSection={<Tag size={16} />}
                    styles={{ input: { fontSize: 16, }, }} />

                <Group justify="right">
                    <Button leftSection={<BookmarkPlus size={16} />} onClick={handleSubmit} loading={isSubmit}>{messages.create.button.regist}</Button>
                </Group>
            </Stack >

        </>
    );
};
