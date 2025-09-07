import TimeAgo from "@/components/TimeAgo";
import { nsidSchema } from "@/nsid/mapping";
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
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
import {getPdsUrl} from "@/logic/HandleDidredolver";


type ArticleCardProps = {
    url: string;
    title: string;
    comment: string;
    tags: string[];
    image?: string | null;
    date: Date
};

export function Article({ url, title, comment, tags, image, date }: ArticleCardProps) {
    const messages = useMessages();

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
                }else{
                    //const pds = getPdsUrl(result.value.repo)
                    return  `https://pdsls.dev/${url}`
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
        <Card withBorder radius="md" className={classes.card} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {(image && false) &&
                <div>
                    <a {...linkProps}>
                        <Image src={image} height={180} />

                    </a>
                </div>
            }

            {tags.length > 0 && (
                <Group mb="xs" gap="xs">
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


            <Group className={classes.footer} gap='sm'>
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
                        {messages.mybookmark.field.original.title} : {domain} <TimeAgo date={date} />
                    </Text>
                </Link>

            </Group>
        </Card>
    );
}