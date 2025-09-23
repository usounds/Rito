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
    Badge,
    Box,
    Card,
    Group,
    Image,
    Modal,
    Text
} from '@mantine/core';
import { SquarePen, Trash2 } from 'lucide-react';
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
};

export function Article({ url, title, handle, comment, tags, image, date, atUri, moderations }: ArticleCardProps) {
    const messages = useMessages();
    const [deleteBookmark, setDeleteBookmark] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [modalSize, setModalSize] = useState('70%')
    const locale = useLocale();
    const router = useRouter();

    useEffect(() => {
        const updateSize = () => {
            if (window.innerWidth < 768) {
                setModalSize('100%')
            } else {
                setModalSize('70%')
            }
        }

        updateSize()
        window.addEventListener('resize', updateSize)
        return () => window.removeEventListener('resize', updateSize)
    }, [])


    const localUrl = (() => {
        if (url.startsWith('https://')) {
            return url
        } else if (url.startsWith('at://')) {
            const result = parseCanonicalResourceUri(url);
            if (result.ok) {
                const schemaEntry = nsidSchema.find(entry => entry.nsid === result.value.collection);
                if (schemaEntry) {
                    const schema = schemaEntry?.schema ?? null;
                    const newUrl = schema?.replace('{did}', result.value.repo).replace('{rkey}', result.value.rkey)
                    return newUrl
                } else {
                    //const pds = getPdsUrl(result.value.repo)
                    return `https://pdsls.dev/${url}`
                }
            }
        }
    })();


    const domain = (() => {
        try {
            return new URL(localUrl || '').hostname; // ドメイン部分だけ取得
        } catch {
            return url; // URL が不正な場合はそのまま表示
        }
    })();

    let imageUrl = image;
    if (imageUrl && !imageUrl.startsWith('https://') && domain) {
        imageUrl = `https://${domain}/${image}`;
    }else{
        imageUrl = undefined;
    }

    return (
        <Card withBorder radius="md" className={classes.card} style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            position: 'relative',
        }}>

            <Box style={{ position: 'relative' }} onClick={() => setIsClicked(!isClicked)}>

                <BlurReveal
                    moderated={moderations.length > 0}
                    blurAmount={6}
                    overlayText={messages.detail.view}
                >


                    {(imageUrl) &&
                        <Card.Section>
                            <Link href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}>
                                <Image src={imageUrl} height={180} />

                            </Link>
                        </Card.Section>
                    }

                    <Text fw={500} c="inherit" >
                        <Link href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}
                            style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                wordBreak: 'break-all',   // 単語途中でも改行
                                overflowWrap: 'anywhere', // 長いURLを折り返す
                            }}>
                            {title}
                        </Link>
                    </Text>
                    <Text component="div" fz="sm" c="dimmed" lineClamp={4} mb="sm">
                        <Markdown
                            components={{
                                p: ({ node, ...props }) => <p style={{ margin: 0.3, whiteSpace: "pre-line" }} {...props} />,
                            }}
                        >{comment}</Markdown>
                    </Text>

                    <TagBadge tags={tags} locale={locale} />
                </BlurReveal>

            </Box>
            <ModerationBadges moderations={moderations} />

            <Group className={classes.footer} gap='xs'>

                {/* 右上固定の atUri エリア */}
                {atUri && (
                    <>
                        <Link href={`/${locale}/bookmark/register?aturi=${encodeURIComponent(atUri)}`}>
                            <ActionIcon variant="transparent" color="gray" aria-label="Edit">
                                <SquarePen size={16} />
                            </ActionIcon>
                        </Link>
                        <ActionIcon
                            variant="transparent"
                            color="red"
                            aria-label="Edit"
                            onClick={() => setDeleteBookmark(true)}
                        >
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
                    </>
                )}
                <Text fz="xs" c="dimmed">
                    <Link
                        href={localUrl || ''}
                        target="_blank"
                        style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            wordBreak: 'break-all',   // 単語途中でも改行
                            overflowWrap: 'anywhere', // 長いURLを折り返す
                        }}
                    >
                        {domain + ' '}
                    </Link>
                    <Link href={`/${locale}/profile/${encodeURIComponent(handle || '')}`}
                        prefetch={false}
                        style={{
                            textDecoration: 'none',
                            color: 'inherit',
                            wordBreak: 'break-all',   // 単語途中でも改行
                            overflowWrap: 'anywhere', // 長いURLを折り返す
                        }}>
                        {handle ? "by @" + handle + ' ' : ""}
                    </Link>
                    <TimeAgo date={date} locale={locale} />
                </Text>

            </Group>
        </Card>
    );
}