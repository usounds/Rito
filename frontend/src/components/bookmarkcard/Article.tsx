"use client"
import { BlurReveal } from "@/components/BlurReveal";
import { ModerationBadges } from "@/components/ModerationBadges";
import { DeleteBookmark } from '@/components/DeleteBookmark';
import { TagBadge } from '@/components/TagBadge';
import TimeAgo from "@/components/TimeAgo";
import { nsidSchema } from "@/nsid/mapping";
import { useRouter } from 'next/navigation';
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
import {
    ActionIcon,
    Box,
    Card,
    Group,
    Image,
    Modal,
    Text
} from '@mantine/core';
import { Space, SquarePen, Trash2 } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import classes from './Article.module.scss';

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
    key?: string
};

export function Article({ url, title, handle, comment, tags, image, date, atUri, moderations, key }: ArticleCardProps) {
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
    }, []);

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
                    {imgSrc &&
                        <Card.Section>
                            <Link href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}>
                                <img
                                    src={imgSrc}
                                    alt="Article Image"
                                    height={180}
                                    style={{ width: '100%', objectFit: 'cover' }}
                                    onError={(e) => e.currentTarget.src = "https://dummyimage.com/360x180/999/fff.png?text=No+Image"}
                                />
                            </Link>
                        </Card.Section>
                    }
                    <Text fw={500} c="inherit" >
                        <Link href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}
                            style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                            {title}
                        </Link>
                    </Text>
                    <Text component="div" fz="sm" c="dimmed" lineClamp={4} mb="sm">
                        <Markdown components={{ p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} /> }}>
                            {comment}
                        </Markdown>
                    </Text>

                    <Group mb='xs'>
                        <TagBadge tags={tags} locale={locale} />
                    </Group>
                </BlurReveal>
            </Box>

            <ModerationBadges moderations={moderations} />

            <Group className={classes.footer} gap='xs'>
                {atUri && (
                    <>
                        <Link href={`/${locale}/bookmark/register?aturi=${encodeURIComponent(atUri)}`}>
                            <ActionIcon variant="transparent" color="gray" aria-label="Edit">
                                <SquarePen size={16} />
                            </ActionIcon>
                        </Link>
                        <ActionIcon variant="transparent" color="red" aria-label="Delete" onClick={() => setDeleteBookmark(true)}>
                            <Trash2 size={16} />
                        </ActionIcon>

                        <Modal opened={deleteBookmark} onClose={() => setDeleteBookmark(false)} size="md" title={messages.delete.title} centered>
                            <DeleteBookmark aturi={atUri} onClose={() => setDeleteBookmark(false)} />
                        </Modal>
                    </>
                )}
                <Text fz="xs" c="dimmed">
                    <Link href={localUrl || ''} target="_blank" style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                        {domain + ' '}
                    </Link>
                    <Link href={`/${locale}/profile/${encodeURIComponent(handle || '')}`} prefetch={false} style={{ textDecoration: 'none', color: 'inherit', wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                        {handle ? "by @" + handle + ' ' : ""}
                    </Link>
                    <TimeAgo date={date} locale={locale} />
                </Text>
            </Group>
        </Card>
    );
}
