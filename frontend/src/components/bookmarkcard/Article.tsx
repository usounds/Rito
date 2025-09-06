import { IconBookmark, IconHeart, IconShare } from '@tabler/icons-react';
import {
    ActionIcon,
    Avatar,
    Badge,
    Card,
    Center,
    Group,
    Image,
    Text,
    useMantineTheme,
} from '@mantine/core';
import classes from './Article.module.scss';
import { useLocale, useMessages } from 'next-intl';

type ArticleCardProps = {
    url: string;
    title: string;
    comment: string;
    tags: string[];
    image?: string | null;
};

export function Article({ url, title, comment, tags, image }: ArticleCardProps) {
    const linkProps = { href: url, target: '_blank', rel: 'noopener noreferrer' };
    const theme = useMantineTheme();
        const messages = useMessages();

    return (
        <Card withBorder radius="md" className={classes.card}>
            <Card.Section>
                <a {...linkProps}>
                    {image &&
                        <Image src={image} height={180} />
                    }
                </a>
            </Card.Section>

            {tags.length > 0 && (
                <Group mt="md" gap="xs">
                    {tags.map((tag, idx) => (
                        <Badge
                            key={idx}
                            variant="gradient"
                            gradient={{ from: "yellow", to: "red" }}
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

            <Group justify="space-between" className={classes.footer}>
                <Center>
                    <Text fz='xs' inline>
                        {messages.mybookmark.field.original.title} : {url}
                    </Text>
                </Center>

                <Group gap={8} mr={0}>
                    <ActionIcon className={classes.action}>
                        <IconHeart size={16} color={theme.colors.red[6]} />
                    </ActionIcon>
                    <ActionIcon className={classes.action}>
                        <IconBookmark size={16} color={theme.colors.yellow[7]} />
                    </ActionIcon>
                    <ActionIcon className={classes.action}>
                        <IconShare size={16} color={theme.colors.blue[6]} />
                    </ActionIcon>
                </Group>
            </Group>
        </Card>
    );
}