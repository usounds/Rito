"use client"
import { BlurReveal } from "@/components/BlurReveal";
import { ModerationBadges } from "@/components/ModerationBadges";
import { DeleteBookmark } from '@/components/DeleteBookmark';
import { TagBadge } from '@/components/TagBadge';
import TimeAgo from "@/components/TimeAgo";
import { nsidSchema } from "@/nsid/mapping";
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
import {
    ActionIcon,
    Box,
    Card,
    Group,
    Stack,
    Modal,
    Spoiler,
    Text
} from '@mantine/core';
import { SquarePen, Trash2 } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import Like from "@/components/Like";
import classes from './Article.module.scss';
import ArticleImage from "@/components/ArticleImage";

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
};

export function Article({ url, title, handle, comment, tags, image, date, atUri, moderations, key, likes, likeDisabled = false }: ArticleCardProps) {
    const messages = useMessages();
    const [deleteBookmark, setDeleteBookmark] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [modalSize, setModalSize] = useState('70%')
    const locale = useLocale();
    const [imgSrc, setImgSrc] = useState(image || '');

    useEffect(() => {
        // モーダルサイズ調整
        const updateSize = () => {
            setModalSize(window.innerWidth < 768 ? '100%' : '70%');
        }
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [modalSize]);

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

    return (
        <Card withBorder radius="md" className={classes.card} style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Box style={{ position: 'relative' }} onClick={() => setIsClicked(!isClicked)}>
                <BlurReveal moderated={moderations.length > 0} blurAmount={6} overlayText={messages.detail.view}>
                    <Card.Section>
                        <Link href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}>
                            <ArticleImage url={url} src={imgSrc} />
                        </Link>
                    </Card.Section>

                    <Spoiler maxHeight={120} showLabel={messages.detail.more} hideLabel={messages.detail.less}>
                        <Text fw={500} c="inherit" >
                            <Link href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}
                                style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                                {title}
                            </Link>
                        </Text>
                    </Spoiler>

                    <Spoiler maxHeight={110} showLabel={messages.detail.more} hideLabel={messages.detail.less}>
                        <Text component="div" fz="sm" c="dimmed" mb="sm">
                            <Markdown components={{ p: ({ ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} /> }}>
                                {comment}
                            </Markdown>
                        </Text>
                    </Spoiler>

                    <Group mb='xs'>
                        {typeof window !== 'undefined' && (
                            <TagBadge tags={tags} locale={locale} />
                        )}
                    </Group>
                </BlurReveal>
            </Box>

            <ModerationBadges moderations={moderations} />

            <Stack className={classes.footer} gap={4}>
                {/* 1行目：アイコン群 */}
                <Group align="center" style={{ width: '100%' }}>
                    {
                        <Like subject={url} likedBy={likes || []} actionDisabled={likeDisabled} />
                    }
                    {atUri && (
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                            <Link href={`/${locale}/bookmark/register?aturi=${encodeURIComponent(atUri)}`}>
                                <ActionIcon variant="transparent" color="gray" aria-label="Edit">
                                    <SquarePen size={16} />
                                </ActionIcon>
                            </Link>
                            <ActionIcon variant="transparent" color="red" aria-label="Delete" onClick={() => setDeleteBookmark(true)}>
                                <Trash2 size={16} />
                            </ActionIcon>

                            <Modal
                                opened={deleteBookmark}
                                onClose={() => setDeleteBookmark(false)}
                                size="md"
                                title={messages.delete.title}
                                centered
                            >
                                <DeleteBookmark aturi={atUri} onClose={() => setDeleteBookmark(false)} />
                            </Modal>
                        </div>
                    )}
                </Group>

                {/* 2行目：Text */}
                <Text fz="xs" c="dimmed">
                    <Link
                        href={localUrl || ''}
                        target="_blank"
                        style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                    >
                        {domain + ' '}
                    </Link>
                    <Link
                        href={`/${locale}/profile/${encodeURIComponent(handle || '')}`}
                        prefetch={false}
                        style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}
                    >
                        {handle ? "by @" + handle + ' ' : ""}
                    </Link>
                    <TimeAgo date={date} locale={locale} />
                </Text>
            </Stack>

        </Card>
    );
}
