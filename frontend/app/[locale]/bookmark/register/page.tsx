"use client";

import { BlueRitoFeedBookmark } from '@/lexicons';
import { nsidSchema } from "@/nsid/mapping";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { isResourceUri, parseCanonicalResourceUri, ParsedCanonicalResourceUri } from '@atcute/lexicons/syntax';
import * as TID from '@atcute/tid';
import { Button, Group, Stack, Tabs, TagsInput, Textarea, TextInput, Container, Modal, Text, LoadingOverlay, Box } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { BadgeCheck, BookmarkPlus, Check, PanelsTopLeft, Tag, X } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { useEffect, useState } from 'react';
import { useMyBookmark } from "@/state/MyBookmark";
import { Comment, Bookmark } from "@/type/ApiTypes";
import { useSearchParams, useRouter } from 'next/navigation';
import Breadcrumbs from "@/components/Breadcrumbs";
import { AppBskyFeedPost } from '@atcute/bluesky';
import { Switch } from '@mantine/core';
import { ActorIdentifier, ResourceUri } from '@atcute/lexicons/syntax';
import { Authentication } from "@/components/Authentication";
import { TagSuggestion } from "@/components/TagSuggest";
import { buildPost } from "@/logic/HandleBluesky";
import { stripTrackingParams } from "@/logic/stripTrackingParams";

export default function RegistBookmarkPage() {
    const messages = useMessages();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const router = useRouter();
    const aturi = searchParams.get("aturi") || undefined;
    const subjectParam = searchParams.get("subject") || undefined;
    const titleParam = searchParams.get("title") || undefined;
    const [tags, setTags] = useState<string[]>([]);
    const [comments, setComments] = useState<Comment[]>([
        { lang: "ja", title: "", comment: "", moderations: [] },
        { lang: "en", title: "", comment: "", moderations: [] },
    ]);
    const [url, setUrl] = useState<string>('');
    const [isFetchOGP, setIsFetchOGP] = useState(false);
    const [isSubmit, setIsSubmit] = useState(false);
    const [isCanVerify, setIsVerify] = useState(false);
    const [isPostToBluesky, setIsPostToBluesky] = useState(false);
    const [isUseOriginalLink, setIsUseOriginalLink] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [ogpTitle, setOgpTitle] = useState<string | null>(null);
    const [ogpDescription, setOgpDescription] = useState<string | null>(null);
    // ... (skip intermediate lines) ...
    {
        !aturi && (
            <>
                <Switch
                    label={messages.create.field.posttobluesky.title}
                    checked={isPostToBluesky}
                    onChange={() => setIsPostToBluesky(!isPostToBluesky)}
                />
                {isPostToBluesky && (
                    <Switch
                        mt="xs"
                        label={messages.create.field.useOriginalLink.title}
                        description={messages.create.field.useOriginalLink.description}
                        checked={isUseOriginalLink}
                        onChange={() => setIsUseOriginalLink(!isUseOriginalLink)}
                    />
                )}
            </>
        )
    }
    const [ogpImage, setOgpImage] = useState<string | null>(null);
    const [aturiParsed, setAturiParsed] = useState<ParsedCanonicalResourceUri | null>(null);
    const setIsNeedReload = useMyBookmark(state => state.setIsNeedReload);
    const [rkey, setRkey] = useState<string | null>(null);
    const [schema, setSchema] = useState<string | null>(null);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const thisClient = useXrpcAgentStore(state => state.thisClient);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const [activeTab, setActiveTab] = useState<string | null>(locale);
    const [loginOpened, setLoginOpened] = useState(false);
    const [isSettingUp, setIsSettingUp] = useState(true);
    const myBookmark = useMyBookmark(state => state.myBookmark);
    const [myTag, setMyTag] = useState<string[]>([]);
    const tagRanking = useMyBookmark(state => state.tagRanking);

    useEffect(() => {
        const allMyTags = myBookmark
            .flatMap((b) => b.tags)
            .filter((t, i, arr) => arr.indexOf(t) === i)
            .filter((t) => t !== "Verified");
        setMyTag(allMyTags);
    }, [myBookmark]);

    useEffect(() => {
        if (!subjectParam && !titleParam && !aturi) {
            setIsSettingUp(false)
            return
        }

        if (subjectParam) {
            try {
                const decodedUrl = decodeURIComponent(subjectParam);
                setUrl(stripTrackingParams(decodedUrl));
            } catch (err) {
                console.error("Invalid URL:", subjectParam, err);
                setUrl(decodeURIComponent(subjectParam)); // fallback
            }
        }

        if (titleParam) {
            const decodedTitle = decodeURIComponent(titleParam);
            setComments(prev =>
                prev.map(comment =>
                    comment.lang === locale
                        ? { ...comment, title: decodedTitle } // 現在の locale に合致するものだけ更新
                        : comment
                )
            );
        }

        if (subjectParam || titleParam) {
            setIsSettingUp(false)
            return
        }

        const fetchBookmark = async () => {
            if (!aturi) {
                return
            }
            try {
                // ① Zustand から先に初期表示用データを探す
                const localBookmark = useMyBookmark.getState().myBookmark.find(
                    (b: Bookmark) => b.uri === aturi
                );

                if (localBookmark) {
                    setUrl(localBookmark.subject);
                    setTags(localBookmark.tags?.filter((t) => t !== "Verified") ?? []);

                    const existingComments: Comment[] = localBookmark.comments ?? [];

                    const commentLangs: Comment[] = (["ja", "en"] as ("ja" | "en")[]).map((lang) => {
                        const existing = existingComments.find((c) => c.lang === lang);
                        return existing
                            ? { ...existing, moderations: existing.moderations ?? [] }
                            : { lang, title: "", comment: "", moderations: [] };
                    });

                    setComments(commentLangs);

                    const activeLangs = existingComments.map((c) => c.lang);
                    if (activeLangs.length === 1) {
                        setActiveTab(activeLangs[0]);
                    } else {
                        setActiveTab(locale);
                    }
                }

                // 念の為サーバーの最新値を
                const res = await fetch(
                    `/xrpc/blue.rito.feed.getBookmark?uri=${encodeURIComponent(aturi)}`
                );

                if (!res.ok) {
                    throw new Error(`API error: ${res.status}`);
                }

                const data = await res.json()

                // API の戻り値は配列 ([]) なので最初の要素を取り出す
                if (Array.isArray(data) && data.length > 0) {
                    const tagsWithoutVerified = data[0].tags.filter((t: string) => t !== 'Verified');
                    setTags(tagsWithoutVerified);
                    setUrl(data[0].subject);
                    // 取得した comments を Comment[] 型で整形
                    const loadedComments: Comment[] = (["ja", "en"] as ("ja" | "en")[]).map((lang) => {
                        const matched = data[0].comments.find((c: { lang: string }) => c.lang === lang);
                        return {
                            lang,
                            title: matched?.title || "",
                            comment: matched?.comment || "",
                            moderations: []
                        };
                    });

                    setComments(loadedComments);
                    const parse = parseCanonicalResourceUri(aturi)
                    if (parse.ok) {
                        setRkey(parse.value.rkey)
                    }

                } else {
                    //setBookmark(null);
                }
            } catch (err) {
                console.error(err);
                //setBookmark(null);
            } finally {
                setIsSettingUp(false)

            }
        };

        fetchBookmark();

    }, [subjectParam, titleParam, locale, aturi]);


    function isValidTangledUrl(url: string, userProfHandle: string): boolean {
        try {
            const u = new URL(url);

            // ドメインが tangled.org であることを確認
            if (u.hostname !== "tangled.org") return false;

            // パスを分解
            const parts = u.pathname.split("/").filter(Boolean);

            // 最低でも2要素必要（例: ["@rito.blue", "skeet.el"]）
            if (parts.length < 2) return false;

            // 1個目が @handle であることを確認
            if (parts[0] !== `@${userProfHandle}`) return false;

            return true;
        } catch {
            return false;
        }
    }

    const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        const value = e.target.value;
        setUrl(value);
        setIsVerify(false)
        setUrlError(null);
        setSchema(null);

        if (!userProf) return

        try {
            // URLが正しいかチェック
            const url = new URL(value)
            const domain = url.hostname
            const handle = userProf.handle


            if (url.pathname === '/' || url.pathname === '') {
                if ((domain == handle || domain.endsWith('.' + handle))) {
                    setIsVerify(true)
                }
            } else if (isValidTangledUrl(value, handle)) {
                setIsVerify(true)
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
                setComments((prev) =>
                    prev.map((c) =>
                        c.lang === activeTab
                            ? {
                                ...c,
                                title: data.result?.ogTitle || c.title,
                                //comment: data.result?.ogDescription || c.comment,
                            }
                            : c
                    ))
                setOgpTitle(data.result?.ogTitle || '');
                setOgpDescription(data.result?.ogDescription || '');
                setOgpImage(data.result?.ogImage?.[0]?.url || '')
            } else {
                console.log('Failed to fetch OGP data');
                notifications.show({
                    title: 'Error',
                    message: messages.create.error.cannotgetogp,
                    color: 'red',
                    icon: <X />
                });

            }
        } catch {
            notifications.show({
                title: 'Error',
                message: messages.create.error.cannotgetogp,
                color: 'red',
                icon: <X />
            });

        }

        setIsFetchOGP(false);
    };

    const handleSubmit = async () => {
        setUrlError('')
        setTitleError('')
        setIsSubmit(true)
        if (!url) {
            setUrlError(messages.create.error.urlMandatory)
            setIsSubmit(false)
            return
        }
        const current = comments.find((c) => c.lang === activeTab);
        if (!current?.title) {
            setTitleError(messages.create.error.titleMandatory);
            setIsSubmit(false)
            return;
        }
        if (!activeDid) {
            setTitleError("activeDid is null");
            setIsSubmit(false)
            return;
        }
        if (url.startsWith('https://')) {
            const urlLocal = new URL(url)
            const domain = urlLocal.hostname
            const res = await fetch(`/api/checkDomain?domain=${encodeURIComponent(domain)}`)
            const data = await res.json() as { result: boolean }
            if (data.result) {
                setUrlError(messages.create.error.blockUrl)
                setIsSubmit(false)
                return

            }

        }


        let ogpTitleLocal = ogpTitle
        let ogpDescriptionLocal = ogpDescription
        let ogpImageLocal = ogpImage

        if (!ogpTitleLocal) {
            let ogpUrl = url
            if (schema && aturiParsed) {
                ogpUrl = schema.replace('{did}', aturiParsed.repo).replace('{rkey}', aturiParsed.rkey)
            }
            if (!ogpUrl) {
                setUrlError(messages.create.error.urlMandatory)
                return
            }
            if (ogpUrl.startsWith('https://')) {
                try {
                    const result = await fetch(`/api/fetchOgp?url=${encodeURIComponent(ogpUrl)}`, {
                        method: 'GET',
                    });
                    if (result.status === 200) {
                        const data = await result.json();
                        ogpTitleLocal = data.result?.ogTitle || '';
                        ogpDescriptionLocal = data.result?.ogDescription || '';
                        ogpImageLocal = data.result?.ogImage?.[0]?.url || ''
                    }
                } catch {
                    console.log('Failed to fetch OGP data');
                }
            }
        }

        // Title が空でないものをすべて取り込む
        const filteredComments = comments
            .filter((c) => c.title.trim() !== "")
            .map((c) => ({
                lang: c.lang,
                title: c.title,
                comment: c.comment || "",
            }));

        // 2件以上ある場合のみ activeTab に一致するコメントを取り出す
        let activeComment: string | undefined;
        if (filteredComments.length >= 2) {
            const matched = filteredComments.find((c) => c.lang === activeTab);
            activeComment = matched?.comment;
        } else {
            activeComment = filteredComments[0].comment
        }


        const obj: BlueRitoFeedBookmark.Main = {
            $type: "blue.rito.feed.bookmark",
            createdAt: new Date().toISOString(),
            subject: url as `${string}:${string}`,
            comments: filteredComments, // Titleが入力されているものは全て登録
            tags: tags.length > 0 ? tags : undefined,
            ogpTitle: ogpTitleLocal || "",
            ogpDescription: ogpDescriptionLocal || "",
            ogpImage: (ogpImageLocal || "") as `${string}:${string}`,
            // activeComment を格納したい場合は以下を追加
            // activeComment,
        };

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

            try {
                const result = await fetch(`/xrpc/blue.rito.feed.getBookmarkBySubject?subject=${encodeURIComponent(url)}&did=${encodeURIComponent(activeDid)}`, {
                    method: 'GET',
                });
                if (result.status === 200) {
                    const data = await result.json();
                    if (data.length != 0) {
                        notifications.show({
                            title: 'Error',
                            message: messages.create.error.duplicate,
                            color: 'red',
                            icon: <X />
                        });
                        setIsSubmit(false)
                        return

                    }
                }
            } catch {
                console.log('Failed to fetch OGP data');
            }
            rkeyLocal = TID.now();
            writes.push({
                $type: "com.atproto.repo.applyWrites#create" as const,
                collection: "blue.rito.feed.bookmark" as `${string}.${string}.${string}`,
                rkey: rkeyLocal,
                value: obj as Record<string, unknown>,
            });

            if (isPostToBluesky) {
                type MyPost = AppBskyFeedPost.Main & {
                    via?: string;
                };

                // Rito URL
                const ritoUrl = `${process.env.NEXT_PUBLIC_URL}/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`;
                // Determine if we should pass ritoUrl to buildPost (to add reference link)
                const postRitoUrl = isUseOriginalLink ? ritoUrl : undefined;

                const appBskyFeedPost: MyPost = {
                    ...(buildPost(activeComment, tags, messages, postRitoUrl) as Omit<MyPost, "via">),
                    via: messages.title
                };

                let ogpMessage = messages.create.inform.ogp
                ogpMessage = ogpMessage.replace("{0}", userProf?.handle ?? "");

                let embedUri = ritoUrl as unknown as ResourceUri;
                let embedTitle = ogpTitleLocal ? `${messages.title} - ${ogpTitleLocal}` : messages.title;
                let embedDesc = ogpMessage || '';
                let embedThumbBlob: any = undefined;

                // Handle Image Blob Upload (Common)
                if (ogpImageLocal) {
                    try {
                        console.log('[DEBUG] Fetching proxy image:', ogpImageLocal);
                        const blobRes = await fetch(`/api/proxyImage?url=${encodeURIComponent(ogpImageLocal)}`);

                        if (blobRes.ok) {
                            let blobData = await blobRes.blob();
                            console.log('[DEBUG] Original blob size:', blobData.size, blobData.type);

                            if (blobData.size > 0) {
                                // Compress if necessary
                                try {
                                    const { compressImage } = await import('@/logic/ImageCompression');
                                    blobData = await compressImage(blobData);
                                    console.log('[DEBUG] Compressed blob size:', blobData.size, blobData.type);
                                } catch (compressErr) {
                                    console.error('[DEBUG] Compression failed, trying original:', compressErr);
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

                                console.log('[DEBUG] Upload response status:', uploadRes.status);

                                if (uploadRes.ok) {
                                    const uploadData = await uploadRes.json();
                                    console.log('[DEBUG] Upload data:', uploadData);
                                    if (uploadData && uploadData.blob) {
                                        embedThumbBlob = uploadData.blob;
                                    }
                                } else {
                                    console.error('[DEBUG] Upload failed:', await uploadRes.text());
                                }
                            }
                        } else {
                            console.error('[DEBUG] Proxy fetch failed:', blobRes.status);
                        }
                    } catch (e) {
                        console.error("[DEBUG] Failed to upload blob", e);
                    }
                }

                if (isUseOriginalLink) {
                    embedUri = url as unknown as ResourceUri;
                    const host = new URL(url).hostname;
                    // Original description
                    embedTitle = ogpTitleLocal || host;
                    embedDesc = ogpDescriptionLocal || '';
                } else {
                    // Rito Link (Default) but with Source Citation
                    // embedUri is already ritoUrl (default)
                    const host = new URL(url).hostname;
                    embedTitle = ogpTitleLocal
                        ? `${messages.create.inform.originalSource} : ${host} - ${ogpTitleLocal}`
                        : `${messages.create.inform.originalSource} : ${host}`;
                    // embedDesc uses default ogpMessage (Rito description)
                }

                // Ensure embedThumbBlob is used
                console.log('[DEBUG] Final embedThumbBlob:', embedThumbBlob);

                appBskyFeedPost.embed = {
                    $type: 'app.bsky.embed.external',
                    external: {
                        uri: embedUri,
                        title: embedTitle,
                        description: embedDesc,
                        thumb: embedThumbBlob
                    },
                };

                writes.push({
                    $type: "com.atproto.repo.applyWrites#create" as const,
                    collection: "app.bsky.feed.post" as `${string}.${string}.${string}`,
                    rkey: rkeyLocal,
                    value: appBskyFeedPost as unknown as Record<string, unknown>,
                });
            }

        }

        if (!activeDid) {
            return
        }

        try {
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
                setRkey(rkeyLocal)
                notifications.show({
                    title: 'Success',
                    message: messages.create.inform.success,
                    color: 'teal',
                    icon: <Check />
                });

                setIsNeedReload(true)
                const referrer = document.referrer;
                const origin = window.location.origin;

                console.log('debug', { referrer, origin })

                const registerPath = `${process.env.NEXT_PUBLIC_URL}/${locale}/bookmark/register`;

                if (referrer.startsWith(origin) && !referrer.startsWith(registerPath)) {
                    // 同じサイトかつ直前ページが /bookmark/register でなければ履歴戻り
                    router.back();
                } else {
                    // 違うサイト、または直前ページが /bookmark/register ならマイブックマークへ
                    router.push(`/${locale}/my/bookmark`);
                }
            } else {
                notifications.show({
                    title: 'Error',
                    message: messages.create.error.unknownError,
                    color: 'red',
                    icon: <X />
                });

            }
        } catch (e) {
            notifications.show({
                title: 'Error',
                message: messages.create.error.unknownError,
                color: 'red',
                icon: <X />
            });

            console.error(e)

        }

        setIsSubmit(false)
    }

    const handleChange = (lang: string, field: keyof Comment, value: string) => {
        setComments((prev) =>
            prev.map((c) =>
                c.lang === lang ? { ...c, [field]: value } : c
            )
        );
    };

    // --- UI ---
    return (
        <Container size="md" mx="auto" >
            <Breadcrumbs
                items={[
                    { label: messages.header.bookmarkMenu, href: `/${locale}/bookmark/search` },

                    { label: messages.create.button.regist }
                ]}
            />
            <Stack >
                <Box pos="relative">
                    <LoadingOverlay
                        visible={isSettingUp}
                        zIndex={1000}
                        overlayProps={{ radius: "sm", blur: 2 }}
                    />

                    {/* Box 内の要素を Stack で縦並び */}
                    <Stack gap="sm">
                        <TextInput
                            label={messages.create.field.url.title}
                            description={isCanVerify ? messages.create.field.url.descriptionForOwner : messages.create.field.url.description}
                            placeholder={messages.create.field.url.placeholder}
                            value={url}
                            onChange={handleUrlChange}
                            leftSection={isCanVerify && <BadgeCheck size={16} />}
                            withAsterisk
                            error={urlError}
                            autoFocus={aturi == null}
                            disabled={!activeDid || isSubmit}
                            styles={{ input: { fontSize: 16 } }}
                        />

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

                        <TagsInput
                            data={[]}
                            value={tags}
                            onChange={(newTags) => {
                                const filtered = newTags.map(tag => tag.replace(/#/g, ""));
                                setTags(filtered);
                            }}
                            label={messages.create.field.tag.title}
                            description={messages.create.field.tag.description}
                            placeholder={messages.create.field.tag.placeholder}
                            maxTags={10}
                            maxLength={25}
                            disabled={!activeDid || isSubmit}
                            leftSection={<Tag size={16} />}
                            clearable
                            styles={{ input: { fontSize: 16 } }}
                        />

                        <TagSuggestion
                            tags={myTag && myTag.length > 0 ? myTag : tagRanking.map(t => t.tag)}
                            selectedTags={tags}
                            setTags={setTags}
                        />

                        <Tabs value={activeTab} onChange={setActiveTab}>
                            <Tabs.List>
                                <Tabs.Tab value="ja">{messages.create.tab.ja}</Tabs.Tab>
                                <Tabs.Tab value="en">{messages.create.tab.en}</Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="ja">
                                <TextInput
                                    label={messages.create.field.title.title}
                                    placeholder={messages.create.field.title.placeholder}
                                    description={messages.create.field.title.description}
                                    error={titleError}
                                    value={comments.find((c) => c.lang === "ja")?.title || ""}
                                    maxLength={50}
                                    onChange={(e) => handleChange("ja", "title", e.currentTarget.value)}
                                    withAsterisk
                                    disabled={!activeDid || isSubmit}
                                    styles={{ input: { fontSize: 16 } }}
                                />
                                <Textarea
                                    label={messages.create.field.comment.title}
                                    description={messages.create.field.comment.description}
                                    placeholder={messages.create.field.comment.placeholder}
                                    value={comments.find((c) => c.lang === "ja")?.comment || ""}
                                    maxLength={2000}
                                    autosize
                                    disabled={!activeDid || isSubmit}
                                    onChange={(e) => handleChange("ja", "comment", e.currentTarget.value)}
                                    styles={{ input: { fontSize: 16 } }}
                                />
                            </Tabs.Panel>

                            <Tabs.Panel value="en">
                                <TextInput
                                    label={messages.create.field.title.title}
                                    placeholder={messages.create.field.title.placeholder}
                                    description={messages.create.field.title.description}
                                    error={titleError}
                                    value={comments.find((c) => c.lang === "en")?.title || ""}
                                    maxLength={50}
                                    onChange={(e) => handleChange("en", "title", e.currentTarget.value)}
                                    withAsterisk
                                    disabled={!activeDid || isSubmit}
                                    styles={{ input: { fontSize: 16 } }}
                                />
                                <Textarea
                                    label={messages.create.field.comment.title}
                                    description={messages.create.field.comment.description}
                                    placeholder={messages.create.field.comment.placeholder}
                                    value={comments.find((c) => c.lang === "en")?.comment || ""}
                                    maxLength={2000}
                                    autosize
                                    disabled={!activeDid || isSubmit}
                                    onChange={(e) => handleChange("en", "comment", e.currentTarget.value)}
                                    styles={{ input: { fontSize: 16 } }}
                                />
                            </Tabs.Panel>
                        </Tabs>

                        <Group justify={activeDid && aturi ? "right" : "space-between"}>
                            {activeDid ? (
                                <>
                                    {!aturi && (
                                        <Group gap="xs" mb="sm">
                                            <Switch
                                                label={messages.create.field.posttobluesky.title}
                                                description={messages.create.field.posttobluesky.description}
                                                checked={isPostToBluesky}
                                                onChange={() => setIsPostToBluesky(!isPostToBluesky)}
                                            />
                                            <Switch
                                                label={messages.create.field.useOriginalLink.title}
                                                description={messages.create.field.useOriginalLink.description}
                                                checked={isUseOriginalLink}
                                                disabled={!isPostToBluesky}
                                                onChange={() => setIsUseOriginalLink(!isUseOriginalLink)}
                                            />
                                        </Group>
                                    )}
                                    <Button
                                        ml="auto"
                                        leftSection={<BookmarkPlus size={16} />}
                                        onClick={handleSubmit}
                                        loading={isSubmit}
                                        disabled={!activeDid || isSubmit}
                                    >
                                        {messages.create.button.regist}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Text>{messages.create.inform.needlogin}</Text>
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
                        </Group>
                    </Stack>
                </Box>
            </Stack>


        </Container>
    );
}
