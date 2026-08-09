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

                <Group gap="md" my="xs" wrap="wrap" justify="center" className={classes.links}>
                    <Link href={`/${locale}/tos`} className={classes.linkItem}>
                        {t('header.termofuse')}
                    </Link>
                    <Link href={`/${locale}/privacy`} className={classes.linkItem}>
                        {t('header.privacypolicy')}
                    </Link>
                    <Link href={`/${locale}/status`} className={classes.linkItem}>
                        {t('status.title')}
                    </Link>

                    <Group gap="sm" wrap="nowrap" style={{ display: 'inline-flex' }}>
                        <a
                            href="https://bsky.app/profile/rito.blue"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={classes.socialIcon}
                            aria-label="Bluesky"
                        >
                            <FaBluesky />
                        </a>
                        <a
                            href="https://github.com/usounds/Rito"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={classes.socialIcon}
                            aria-label="GitHub"
                        >
                            <FaGithub />
                        </a>
                    </Group>
                </Group>
            </Container>
        </div>
    );
}
