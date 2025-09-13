"use client"
import { RegistBookmark } from '@/components/RegistBookmark';
import TimeAgo from "@/components/TimeAgo";
import { nsidSchema } from "@/nsid/mapping";
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
import { BadgeCheck, SquarePen, Trash2 } from 'lucide-react';
import { useMessages } from 'next-intl';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import classes from './Article.module.scss';

type ArticleCardProps = {
    url: string;
    title: string;
    comment: string;
    tags: string[];
    image?: string | null;
    date: Date,
    atUri?: string,
    moderations: string[]
};

export function Article({ url, title, comment, tags, image, date, atUri, moderations }: ArticleCardProps) {
    const messages = useMessages();
    const [quickRegistBookmark, setQuickRegistBookmark] = useState(false);
    const [isClicked, setIsClicked] = useState(false);
    const [modalSize, setModalSize] = useState('70%')

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

    const linkProps = { href: localUrl, target: '_blank', rel: 'noopener noreferrer' };

    return (
        <Card withBorder radius="md" className={classes.card} style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            position: 'relative',
        }}>

            {(image && false) &&
                <div>
                    <a {...linkProps}>
                        <Image src={image} height={180} />

                    </a>
                </div>
            }

            <Box style={{ position: 'relative' }} onClick={() => setIsClicked(!isClicked)}>
                {(moderations.length > 0 && !isClicked) && (
                    <Box
                        style={{
                            position: 'absolute',
                            inset: 0,
                            backdropFilter: 'blur(4px)',
                            zIndex: 10,
                        }}
                    />
                )}

                {tags.length > 0 && (
                    <Group mb="xs" gap={3}>
                        {tags.map((tag, idx) => (
                            <Badge
                                key={idx}
                                variant="light"
                                color={tag === 'Verified' ? 'orange' : 'blue'}
                                styles={{ root: { textTransform: 'none' } }}
                            >
                                {tag === 'Verified' ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <BadgeCheck size={12} /> {tag}
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center' }}>{tag}</span>
                                )}
                            </Badge>
                        ))}
                    </Group>
                )}

                <Text className={classes.title} fw={500} component="a" {...linkProps}>
                    {title}
                </Text>

                <Text component="div" fz="sm" c="dimmed" lineClamp={4} mb="sm">
                    <Markdown>{comment}</Markdown>
                </Text>
            </Box>
            <Group mb="xs" gap={4}>
                {moderations.map((mod, idx) => (
                    <Badge
                        key={idx}
                        color="gray"
                        variant="outline"
                        styles={{ root: { textTransform: 'none' } }}
                    >
                        {messages?.moderations?.[mod] ?? mod}
                        {/* messages に翻訳があればそれを表示、なければ生の値 */}
                    </Badge>
                ))}
            </Group>

            <Group className={classes.footer} gap='xs'>

                {/* 右上固定の atUri エリア */}
                {atUri && (
                    <>
                        <ActionIcon
                            variant="transparent"
                            color="gray"
                            aria-label="Edit"
                            onClick={() => setQuickRegistBookmark(true)}
                        >
                            <SquarePen size={16} />
                        </ActionIcon>
                        <ActionIcon
                            variant="transparent"
                            color="red"
                            aria-label="Edit"
                            onClick={() => setQuickRegistBookmark(true)}
                        >
                            <Trash2 size={16} />
                        </ActionIcon>

                        <Modal
                            opened={quickRegistBookmark}
                            onClose={() => setQuickRegistBookmark(false)}
                            size={modalSize}
                            title={messages.create.title}
                            centered
                        >
                            <RegistBookmark aturi={atUri} />
                        </Modal>
                    </>
                )}
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
                    <Text fz="xs" c="dimmed">
                        {domain} <TimeAgo date={date} />
                    </Text>
                </Link>

            </Group>
        </Card>
    );
}