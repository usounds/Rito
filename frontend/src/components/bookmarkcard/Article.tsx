import {
    Badge,
    Card,
    Group,
    Image,
    Text
} from '@mantine/core';
import { useMessages } from 'next-intl';
import Link from 'next/link';
import classes from './Article.module.scss';
import TimeAgo from "@/components/TimeAgo"

type ArticleCardProps = {
    url: string;
    title: string;
    comment: string;
    tags: string[];
    image?: string | null;
    date: Date
};

export function Article({ url, title, comment, tags, image, date }: ArticleCardProps) {
    const linkProps = { href: url, target: '_blank', rel: 'noopener noreferrer' };
    const messages = useMessages();

    const domain = (() => {
        try {
            return new URL(url).hostname; // ドメイン部分だけ取得
        } catch {
            return url; // URL が不正な場合はそのまま表示
        }
    })();

    return (
        <Card withBorder radius="md" className={classes.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div>
                <a {...linkProps}>
                    {(image&&false) &&
                        <Image src={image} height={180} />
                    }
                </a>
            </div>

            {tags.length > 0 && (
                <Group mt="md" gap="xs">
                    {tags.map((tag, idx) => (
                        <Badge
                            key={idx}
                            variant="light"
                        >
                            {tag}
                        </Badge>
                    ))}
                </Group>
            )}

            <Text className={classes.title} fw={500} component="a" {...linkProps}>
                {title}
            </Text>

            <Text fz="sm" c="dimmed" lineClamp={4}>
                {comment}
            </Text>


            <Group className={classes.footer}>
                <Link
                    href={url}
                    target="_blank"
                    style={{
                        textDecoration: 'none',
                        color: 'inherit',
                        wordBreak: 'break-all',   // 単語途中でも改行
                        overflowWrap: 'anywhere', // 長いURLを折り返す
                    }}
                >
                    <Text fz="xs" c="dimmed">
                        {messages.mybookmark.field.original.title} : {domain} <TimeAgo date={date}/>
                    </Text>
                </Link>

            </Group>
        </Card>
    );
}