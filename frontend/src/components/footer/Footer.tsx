import { Container, Group, Text,Anchor } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import { FaBluesky, FaGithub } from "react-icons/fa6";
import classes from './Footer.module.scss';
import Link from 'next/link';

type FooterProps = {
    locale: string;
};

export async function Footer({ locale }: FooterProps) {
    const t = await getTranslations({ locale });

    return (
        <div className={classes.footer}>
            <Container className={classes.inner}>
                <Text c="dimmed">Developed by usounds.work</Text>

                <Group gap="md" my="sm" wrap="nowrap">
<Anchor
  href={`/${locale}/status`}
  c="dimmed"
  size="sm"
  style={{ textDecoration: 'none', cursor: 'pointer' }}
>
  {t('status.title')}
</Anchor>

                    <a
                        href="https://bsky.app/profile/rito.blue"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", color: "#666", fontSize: 20 }}
                    >
                        <FaBluesky />
                    </a>

                    <a
                        href="https://github.com/usounds/Rito"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", color: "#666", fontSize: 20 }}
                    >
                        <FaGithub />
                    </a>
                </Group>
            </Container>
        </div>
    );
}
