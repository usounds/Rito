"use client";

import { BlueRitoFeedBookmark } from '@/lexicons';
import { nsidSchema } from "@/nsid/mapping";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { isResourceUri, parseCanonicalResourceUri, ParsedCanonicalResourceUri } from '@atcute/lexicons/syntax';
import * as TID from '@atcute/tid';
import { Button, Group, Stack, Tabs, TagsInput, Textarea, TextInput, Container } from '@mantine/core';
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
import RichtextBuilder from '@atcute/bluesky-richtext-builder';
const MAX_TEXT_LENGTH = 300;

export function buildPost(
    activeComment: string | undefined,
    tags: string[],
    messages: any
) {
    const builder = new RichtextBuilder();

    // ホワイトスペースを含むタグは除外
    let validTags = tags.filter(tag => !/\s/.test(tag));

    // rito.blue が含まれていなければ追加
    if (!validTags.includes("rito.blue")) {
        validTags = [...validTags, "rito.blue"];
    }

    // タグ分の文字数を計算（# + タグ文字 + 半角スペース）
    const tagsLength = validTags.reduce((sum, tag) => {
        return sum + 1 + tag.length + 1; // # + tag.length + 半角スペース
    }, 0);

    // text部分を短くして addText
    const baseText = activeComment || messages.create.inform.bookmark;
    builder.addText(baseText.slice(0, MAX_TEXT_LENGTH - tagsLength));

    // タグを追加（全てのタグの前に半角スペース）
    validTags.forEach(tag => {
        builder.addText(" "); // 半角スペースを挿入
        builder.addTag(tag);
    });

    return {
        $type: "app.bsky.feed.post",
        text: builder.text,
        facets: builder.facets,
        createdAt: new Date().toISOString(),
        via: messages.title
    };
}

export default function RegistBookmarkPage() {
    const messages = useMessages();
    const locale = useLocale();
    const searchParams = useSearchParams();
    const router = useRouter();
    const aturi = searchParams.get("aturi") || undefined;
    const subjectParam = searchParams.get("subject") || undefined;

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
    const [urlError, setUrlError] = useState<string | null>(null);
    const [titleError, setTitleError] = useState<string | null>(null);
    const [ogpTitle, setOgpTitle] = useState<string | null>(null);
    const [ogpDescription, setOgpDescription] = useState<string | null>(null);
    const [ogpImage, setOgpImage] = useState<string | null>(null);
    const [aturiParsed, setAturiParsed] = useState<ParsedCanonicalResourceUri | null>(null);
    const setIsNeedReload = useMyBookmark(state => state.setIsNeedReload);
    const [rkey, setRkey] = useState<string | null>(null);
    const [schema, setSchema] = useState<string | null>(null);
    const activeDid = useXrpcAgentStore(state => state.activeDid);
    const thisClient = useXrpcAgentStore(state => state.thisClient);
    const userProf = useXrpcAgentStore(state => state.userProf);
    const [activeTab, setActiveTab] = useState<string | null>(locale);

    useEffect(() => {
        if (subjectParam) {
            // URI デコードしてからセット
            setUrl(decodeURIComponent(subjectParam));
        }
    }, [subjectParam]);

    useEffect(() => {
        if (!activeDid) {
            router.back();
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
                    // ここで localBookmark を初期値としてセット
                    setUrl(localBookmark.subject); // subject が Bookmark にある前提
                    setTags(localBookmark.tags?.filter((t: string) => t !== "Verified") ?? []);
                    setComments(
                        (["ja", "en"] as ("ja" | "en")[]).map((lang) => ({
                            lang,
                            title: "",
                            comment: "",
                            moderations: [],
                        }))
                    );
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
                        parse.value.repo
                        parse.value.rkey
                    }

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
    }, [aturi, activeDid]);

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
        if (!url) {
            setUrlError(messages.create.error.urlMandatory)
            return
        }
        const current = comments.find((c) => c.lang === activeTab);
        if (!current?.title) {
            setTitleError(messages.create.error.titleMandatory);
            return;
        }
        if (!activeDid) {
            setTitleError("activeDid is null");
            return;
        }
        setIsSubmit(true)
        if (url.startsWith('https://')) {
            const urlLocal = new URL(url)
            const domain = urlLocal.hostname
            const res = await fetch(`/api/checkDomain?domain=${encodeURIComponent(domain)}`)
            const data = await res.json() as { result: boolean }
            if (data.result) {
                setUrlError(messages.create.error.blockUrl)
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

                const appBskyFeedPost: MyPost = {
                    ...(buildPost(activeComment, tags, messages) as Omit<MyPost, "via">),
                    via: messages.title
                };

                let ogpMessage = messages.create.inform.ogp

                ogpMessage = ogpMessage.replace("{0}", userProf?.handle ?? "");

                appBskyFeedPost.embed = {
                    $type: 'app.bsky.embed.external',
                    external: {
                        uri: `${process.env.NEXT_PUBLIC_URL}/${locale}/bookmark/details?uri=${encodeURIComponent(url)}` as unknown as ResourceUri,
                        title: messages.title,
                        description: ogpMessage,
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

            const ret = await thisClient.post('com.atproto.repo.applyWrites', {
                input: {
                    repo: activeDid as ActorIdentifier,
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

                setIsNeedReload(true)
                router.back();
            } else {
                notifications.show({
                    title: 'Error',
                    message: messages.create.error.unknownError,
                    color: 'red',
                    icon: <X />
                });

            }
        } catch {
            notifications.show({
                title: 'Error',
                message: messages.create.error.unknownError,
                color: 'red',
                icon: <X />
            });

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
            <Stack gap="sm">
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
                <TagsInput
                    data={[]}
                    value={tags}
                    onChange={(newTags) => {
                        // 新しいタグ配列から '#' を含むタグを除外
                        const filtered = newTags.map(tag => tag.replace(/#/g, ""));
                        setTags(filtered);
                    }}
                    label={messages.create.field.tag.title}
                    description={messages.create.field.tag.description}
                    placeholder={messages.create.field.tag.placeholder}
                    maxTags={10}
                    maxLength={25}
                    leftSection={<Tag size={16} />}
                    clearable
                    styles={{ input: { fontSize: 16 } }}
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
                            styles={{ input: { fontSize: 16 } }}
                        />
                        <Textarea
                            label={messages.create.field.comment.title}
                            description={messages.create.field.comment.description}
                            placeholder={messages.create.field.comment.placeholder}
                            value={comments.find((c) => c.lang === "ja")?.comment || ""}
                            maxLength={2000}
                            autosize
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
                            styles={{ input: { fontSize: 16 } }}
                        />
                        <Textarea
                            label={messages.create.field.comment.title}
                            description={messages.create.field.comment.description}
                            placeholder={messages.create.field.comment.placeholder}
                            value={comments.find((c) => c.lang === "en")?.comment || ""}
                            maxLength={2000}
                            autosize
                            onChange={(e) => handleChange("en", "comment", e.currentTarget.value)}
                            styles={{ input: { fontSize: 16 } }}
                        />
                    </Tabs.Panel>
                </Tabs>

                <Group justify="right">
                    {!aturi &&
                        <Switch
                            label={messages.create.field.posttobluesky.title}
                            checked={isPostToBluesky}
                            onChange={() => setIsPostToBluesky(!isPostToBluesky)}
                        />
                    }
                    <Button leftSection={<BookmarkPlus size={16} />} onClick={handleSubmit} loading={isSubmit}>{messages.create.button.regist}</Button>
                </Group>
            </Stack >

        </Container>
    );
}
