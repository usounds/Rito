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
    Text,
} from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import Link from 'next/link';
import { useState, useMemo } from 'react';
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
    date?: Date;
    moderations: string[];
    likes?: string[];
    likeDisabled?: boolean;
    bookmarkCount?: number;
    priority?: boolean;
};

export function Article({ 
    url, 
    title, 
    handle, 
    comment, 
    tags, 
    image, 
    date, 
    moderations, 
    likes, 
    likeDisabled = false, 
    bookmarkCount, 
    priority = false 
}: ArticleCardProps) {
    const messages = useMessages();
    const locale = useLocale();

    const [isClicked, setIsClicked] = useState(false);

    const localUrl = useMemo(() => {
        if (url.startsWith('https://') || url.startsWith('http://')) return url;
        if (url.startsWith('at://')) {
            try {
                const result = parseCanonicalResourceUri(url);
                const schemaEntry = nsidSchema.find(e => e.nsid === result.collection);
                if (schemaEntry) {
                    const schema = schemaEntry?.schema ?? null;
                    return schema?.replace('{did}', result.repo).replace('{rkey}', result.rkey) || `https://pdsls.dev/${url}`;
                } else {
                    return `https://pdsls.dev/${url}`;
                }
            } catch {
                return url;
            }
        }
        return url;
    }, [url]);

    const domain = useMemo(() => {
        if (!localUrl) return url;
        try { return new URL(localUrl).hostname || url; }
        catch { return url; }
    }, [localUrl, url]);

    const imgSrc = useMemo(() => {
        if (image && !image.startsWith('https://') && !image.startsWith('http://') && domain) {
            return `https://${domain}/${image}`;
        }
        return image || '';
    }, [image, domain]);

    // categoryName は未使用のため削除。もし必要になったら locale を使って categoryNames から取得する。

    return (
        <Card withBorder radius="md" padding={0} className={classes.card}>
            <Box style={{ position: 'relative', flex: 1 }} onClick={() => setIsClicked(!isClicked)}>
                <BlurReveal moderated={moderations.length > 0} moderations={moderations} blurAmount={6} overlayText={messages.detail.view}>
                    <div className={classes.cardContent}>
                        <div className={classes.imageWrapper}>
                            <Link href={localUrl || ''} target="_blank">
                                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                                    <ArticleImage url={url} src={imgSrc} priority={priority} />
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
                                    style={{ display: 'block', textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere', minHeight: '24px' }}>
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
                        <Link
                            href={`/${locale}/profile/${encodeURIComponent(handle)}`}
                            prefetch={false}
                            className={classes.metaHandle}
                        >
                            @{handle}
                        </Link>
                    )}
                    {handle && date && <span className={classes.metaSeparator} />}
                    {date ? (
                        <TimeAgo date={date} locale={locale} />
                    ) : (
                        <Text size="xs" style={{ color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))' }}>
                            {messages.header.notbookmarked}
                        </Text>
                    )}
                </div>
            </Stack>

        </Card>
    );
}
