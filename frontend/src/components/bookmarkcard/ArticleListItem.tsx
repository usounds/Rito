"use client";
import { BlurReveal } from "@/components/BlurReveal";
import { ModerationBadges } from "@/components/ModerationBadges";
import { TagBadge } from '@/components/TagBadge';
import EditMenu from '@/components/EditMenu';
import TimeAgo from "@/components/TimeAgo";
import { nsidSchema } from "@/nsid/mapping";
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
import {
    Box,
    Group,
    Text,
    Badge,
} from '@mantine/core';
import { useLocale, useMessages } from 'next-intl';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import Like from "@/components/Like";
import ArticleImage from "@/components/ArticleImage";
import { Globe, Users } from 'lucide-react';
import dynamic from 'next/dynamic';
import classes from './ArticleListItem.module.scss';

const Markdown = dynamic(() => import('react-markdown'), { ssr: false });

type ArticleListItemProps = {
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
    badge?: React.ReactNode;
    actionSection?: React.ReactNode;
};

export function ArticleListItem({
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
    priority = false,
    badge,
    actionSection
}: ArticleListItemProps) {
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

    return (
        <div className={classes.item}>
            <Box onClick={() => setIsClicked(!isClicked)}>
                <BlurReveal moderated={moderations.length > 0} moderations={moderations} blurAmount={6} overlayText={messages.detail.view}>
                    <div className={classes.contentRow}>
                        <div className={classes.imageWrapper}>
                            <Link href={localUrl || ''} target="_blank">
                                <ArticleImage url={url} src={imgSrc} priority={priority} />
                            </Link>
                        </div>

                        <div className={classes.textContent}>
                            <Group gap={6} align="center" wrap="wrap">
                                <Link
                                    href={localUrl || ''}
                                    target="_blank"
                                    className={classes.sourceLabel}
                                >
                                    <Globe size={11} />
                                    {domain}
                                </Link>
                                {badge}
                                {handle && (
                                    <Link
                                        href={`/${locale}/profile/${encodeURIComponent(handle)}`}
                                        prefetch={false}
                                        className={classes.metaHandle}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        @{handle}
                                    </Link>
                                )}
                                {bookmarkCount !== undefined && bookmarkCount > 1 && (
                                    <Badge size="xs" variant="light" color="blue" leftSection={<Users size={10} />}>
                                        {bookmarkCount} users
                                    </Badge>
                                )}
                                <Group gap={6} ml="auto" align="center">
                                    {date && (
                                        <Text size="xs" c="dimmed">
                                            <TimeAgo date={date} locale={locale} />
                                        </Text>
                                    )}
                                    {actionSection}
                                </Group>
                            </Group>

                            <Link
                                href={`/${locale}/bookmark/details?uri=${encodeURIComponent(url)}`}
                                className={classes.title}
                            >
                                {title}
                            </Link>

                            {comment && (
                                <div className={classes.comment}>
                                    <Markdown components={{
                                        p: ({ ...props }) => <span style={{ margin: 0 }} {...props} />,
                                        h1: ({ ...props }) => <span style={{ margin: 0, fontWeight: 600 }} {...props} />,
                                        h2: ({ ...props }) => <span style={{ margin: 0, fontWeight: 600 }} {...props} />,
                                        h3: ({ ...props }) => <span style={{ margin: 0, fontWeight: 600 }} {...props} />,
                                        h4: ({ ...props }) => <span style={{ margin: 0, fontWeight: 600 }} {...props} />,
                                        h5: ({ ...props }) => <span style={{ margin: 0, fontWeight: 600 }} {...props} />,
                                        h6: ({ ...props }) => <span style={{ margin: 0, fontWeight: 600 }} {...props} />,
                                    }}>
                                        {comment}
                                    </Markdown>
                                </div>
                            )}

                            <div className={classes.tagRow}>
                                <TagBadge tags={tags} locale={locale} />
                                <Group gap={6} ml="auto" align="center">
                                    <Like subject={url} likedBy={likes || []} actionDisabled={likeDisabled} />
                                    <EditMenu subject={url} title={title} tags={tags} image={imgSrc || ''} description={comment} />
                                </Group>
                            </div>
                        </div>
                    </div>
                </BlurReveal>
            </Box>

            {moderations.length > 0 && (
                <Box mt={4}>
                    <ModerationBadges moderations={moderations} />
                </Box>
            )}
        </div>
    );
}
