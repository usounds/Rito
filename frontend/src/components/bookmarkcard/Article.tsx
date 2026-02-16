"use client"
import { BlurReveal } from "@/components/BlurReveal";
import { ModerationBadges } from "@/components/ModerationBadges";
import { TagBadge } from '@/components/TagBadge';
import EditMenu from '@/components/EditMenu';
import TimeAgo from "@/components/TimeAgo";
import { nsidSchema } from "@/nsid/mapping";
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
import {
    Box,
    Card,
    Group,
    Stack,
} from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Like from "@/components/Like";
import classes from './Article.module.scss';
import ArticleImage from "@/components/ArticleImage";
import { Globe, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
const Markdown = dynamic(() => import('react-markdown'), { ssr: false });

type ArticleCardProps = {
    url: string;
    title: string;
    handle?: string;
    comment: string;
    tags: string[];
    image?: string | null;
    date: Date,
    atUri?: string,
    moderations: string[]
    likes?: string[];
    key?: string
    likeDisabled?: boolean
    category?: string | null;
    bookmarkCount?: number;
};

export function Article({ url, title, handle, comment, tags, image, date, atUri, moderations, key, likes, likeDisabled = false, category, bookmarkCount }: ArticleCardProps) {
    const messages = useMessages();

    const [isClicked, setIsClicked] = useState(false);
    const locale = useLocale();
    const [imgSrc, setImgSrc] = useState(image || '');

    useEffect(() => {
        setIsClicked(false)
    }, [key]);


    const localUrl = (() => {
        if (url.startsWith('https://')) return url;
        if (url.startsWith('at://')) {
            const result = parseCanonicalResourceUri(url);
            if (result.ok) {
                const schemaEntry = nsidSchema.find(e => e.nsid === result.value.collection);
                if (schemaEntry) {
                    const schema = schemaEntry?.schema ?? null;
                    return schema?.replace('{did}', result.value.repo).replace('{rkey}', result.value.rkey) || `https://pdsls.dev/${url}`;
                } else {
                    return `https://pdsls.dev/${url}`;
                }
            }
        }
    })();

    const domain = (() => {
        try { return new URL(localUrl || '').hostname; }
        catch { return url; }
    })();

    // 相対パスの場合のみ imgSrc を更新
    useEffect(() => {
        if (image && !image.startsWith('https://') && domain) {
            setImgSrc(`https://${domain}/${image}`);
        }
    }, [image, domain]);

    const categoryNames: Record<string, Record<string, string>> = {
        general: { ja: "一般", en: "General" },
        atprotocol: { ja: "AT Protocol", en: "AT Protocol" },
        social: { ja: "社会・政治・経済", en: "Social/Politics/Economy" },
        technology: { ja: "テクノロジー", en: "Technology" },
        lifestyle: { ja: "暮らし・学び", en: "Lifestyle/Learning" },
        food: { ja: "食事", en: "Food" },
        travel: { ja: "旅行", en: "Travel" },
        entertainment: { ja: "エンタメ・おもしろ", en: "Entertainment/Humor" },
        anime_game: { ja: "アニメ・ゲーム", en: "Anime/Game" },
    };

    const categoryName = category && categoryNames[category]
        ? categoryNames[category][locale] || categoryNames[category]["en"]
        : category; // 文字列があればそのまま表示するフォールバックを追加

    return (
        <Card withBorder radius="md" padding={0} className={classes.card}>
            <Box style={{ position: 'relative', flex: 1 }} onClick={() => setIsClicked(!isClicked)}>
                <BlurReveal moderated={moderations.length > 0} blurAmount={6} overlayText={messages.detail.view}>
                    <div className={classes.cardContent}>
                        <div className={classes.imageWrapper}>
                            <Link href={localUrl || ''} target="_blank">
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                                    <ArticleImage url={url} src={imgSrc} />
                                </div>
                            </Link>
                        </div>

                        <div className={classes.textContent}>
                            <Link
                                href={localUrl || ''}
                                target="_blank"
                                className={classes.sourceLabel}
                            >
                                <Globe size={11} />
                                {domain}
                            </Link>

                            <div className={classes.title}>
                                <Link href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}
                                    style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                    {title}
                                </Link>
                            </div>

                            <div className={classes.comment}>
                                <Markdown components={{ p: ({ ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} /> }}>
                                    {comment}
                                </Markdown>
                            </div>

                            <Group mb='xs' gap={4} align="center">
                                {bookmarkCount !== undefined && bookmarkCount > 1 && (
                                    <span className={classes.usersCount}>
                                        <Users size={11} />
                                        {bookmarkCount} users
                                    </span>
                                )}
                                <TagBadge tags={tags} locale={locale} />
                            </Group>

                        </div>
                    </div>
                </BlurReveal>
            </Box>

            <div className={classes.moderation}>
                <ModerationBadges moderations={moderations} />
            </div>

            <Stack className={classes.footer} gap={4}>
                {/* アクション行 */}
                <div className={classes.footerActions}>
                    <Like subject={url} likedBy={likes || []} actionDisabled={likeDisabled} />
                    <div style={{ marginLeft: 'auto' }}>
                        <EditMenu subject={url} title={title} tags={tags} image={imgSrc} description={comment} />
                    </div>
                </div>

                {/* メタ情報行 */}
                <div className={classes.metaRow}>
                    {handle && (
                        <>
                            <Link
                                href={`/${locale}/profile/${encodeURIComponent(handle)}`}
                                prefetch={false}
                                className={classes.metaHandle}
                            >
                                @{handle}
                            </Link>
                            <span className={classes.metaSeparator} />
                        </>
                    )}
                    <TimeAgo date={date} locale={locale} />
                </div>
            </Stack>

        </Card>
    );
}
