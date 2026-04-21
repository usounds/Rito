"use client";

import { useEffect, useState, useMemo } from 'react';
import { useXrpcAgentStore } from '@/state/XrpcAgent';
import { aggregateNsids, nsidToDomain } from '@/logic/HandleNsidAggregation';
import { Article } from '@/components/bookmarkcard/Article';
import Breadcrumbs from "@/components/Breadcrumbs";
import { SimpleGrid, Container, Title, Text, Center, Loader, Stack, Box } from '@mantine/core';
import { useLocale, useMessages, useTranslations } from 'next-intl';
import { LoginButtonOrUser } from '@/components/header/LoginButtonOrUser';
import animationClasses from '../../bookmark/search/latestbookmark/LatestBookmark.module.scss';

type SchemaResult = {
    nsid: string;
    schema?: string;
    domain?: string;
    ogpTitle?: string;
    ogpDescription?: string;
    ogpImage?: string;
    tags?: string[];
    moderations?: string[];
    verified?: boolean;
    error?: string;
    indexedAt?: string;
};

export default function MyAppsPage() {
    const { activeDid } = useXrpcAgentStore();
    const locale = useLocale();
    const messages = useMessages();
    const t = useTranslations();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [apps, setApps] = useState<SchemaResult[]>([]);

    useEffect(() => {
        if (!activeDid) {
            setLoading(false);
            return;
        }

        async function fetchData() {
            setLoading(true);
            try {
                // 1. コレクション一覧を取得
                const repoRes = await fetch('/api/repo-collections');
                if (repoRes.status === 401 || repoRes.status === 403) {
                    setError(null);
                    setLoading(false);
                    return;
                }
                if (!repoRes.ok) {
                    const errorText = await repoRes.text();
                    throw new Error(`Failed to fetch collections: ${repoRes.status} ${errorText}`);
                }
                const repoData = await repoRes.json();
                const collections = repoData.collections as string[];

                if (collections.length === 0) {
                    setApps([]);
                    return;
                }

                // 2. ブックマーク情報をアプリ用APIで取得 (ルートURL検索)
                const bookmarkRes = await fetch(`/api/app-bookmarks?nsids=${collections.join(',')}`);
                if (!bookmarkRes.ok) {
                    const errorText = await bookmarkRes.text();
                    throw new Error(`Failed to fetch app bookmarks: ${bookmarkRes.status} ${errorText}`);
                }
                const bookmarkData = await bookmarkRes.json();
                
                // Record<string, SchemaResult> を配列に変換してセット
                const appsList = collections.map(nsid => bookmarkData.results[nsid]);
                setApps(appsList);

            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Error loading apps');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [activeDid]);

    return (
        <Container size="md" mx="auto" my="sx">
            <Breadcrumbs items={[{ label: t("header.myapps") }]} />
            
            {!activeDid ? (
                <Box
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '1rem',
                    }}
                >
                    <Text>{t("header.needlogin")}</Text>
                    <LoginButtonOrUser />
                </Box>
            ) : loading ? (
                <Center h={300}>
                    <Stack align="center">
                        <Loader size="lg" />
                        <Text>{messages.loading}...</Text>
                    </Stack>
                </Center>
            ) : error ? (
                <Center h={300}>
                    <Text c="red">{error}</Text>
                </Center>
            ) : apps.length === 0 ? (
                <Text>{messages.detail.inform.nobookmark}</Text>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {apps.map((app, index) => {
                        const domain = app.domain || nsidToDomain(app.nsid);
                        const url = app.schema || `https://${domain}`;
                        
                        return (
                            <div key={app.nsid} className={animationClasses.articleItem}>
                                <Article
                                    url={url}
                                    title={app.ogpTitle || app.nsid}
                                    comment={app.ogpDescription || ""}
                                    tags={app.tags || []}
                                    image={app.ogpImage || null}
                                    date={app.indexedAt ? new Date(app.indexedAt) : undefined}
                                    moderations={app.moderations || []}
                                    priority={index < 6}
                                />
                            </div>
                        );
                    })}
                </SimpleGrid>
            )}
        </Container>
    );
}
