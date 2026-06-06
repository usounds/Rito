import { Container, Group, Text } from '@mantine/core';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { FaBluesky, FaGithub } from "react-icons/fa6";
import classes from './Footer.module.scss';

type FooterProps = {
    locale: string;
};

export async function Footer({ locale }: FooterProps) {
    const t = await getTranslations({ locale });

    return (
        <div className={classes.footer}>
            <Container className={classes.inner}>
                <Text style={{ color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))' }}>Developed by usounds.work</Text>

                <Group gap="md" my="sm" wrap="nowrap">

                    <Link href={`/${locale}/tos`} style={{ textDecoration: 'none', cursor: 'pointer', color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))', fontSize: '0.875rem' }}>
                        {t('header.termofuse')}
                    </Link>
                    <Link href={`/${locale}/privacy`} style={{ textDecoration: 'none', cursor: 'pointer', color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))', fontSize: '0.875rem' }}>
                        {t('header.privacypolicy')}
                    </Link>

                    <Link
                        href={`/${locale}/status`}
                        style={{ textDecoration: 'none', cursor: 'pointer', color: 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-dark-2))', fontSize: '0.875rem' }}
                    >
                        {t('status.title')}
                    </Link>

                    <a
                        href="https://bsky.app/profile/rito.blue"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", color: "#666", fontSize: 20 }}
                        aria-label="Bluesky"
                    >
                        <FaBluesky />
                    </a>

                    <a
                        href="https://github.com/usounds/Rito"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", color: "#666", fontSize: 20 }}
                        aria-label="GitHub"
                    >
                        <FaGithub />
                    </a>
                </Group>
            </Container>
        </div>
    );
}
