'use client';
import { Button, Group, TagsInput, SimpleGrid, Box } from '@mantine/core';
import { Search } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from "next/navigation";
import { ClipboardPaste } from 'lucide-react';
import { TagSuggestion } from "@/components/TagSuggest";
import User from "@/components/user/User";
import { TagRanking } from '@/type/ApiTypes';

type SearchFormProps = {
    defaultTags?: string[];
    userTags?: string[];
    tagCounts?: Record<string, number>;
    did: string;
};

export function SearchForm({
    defaultTags = [],
    userTags = [],
    tagCounts: initialTagCounts,
    did,
}: SearchFormProps) {
    const [tags, setTags] = useState<string[]>(defaultTags);
    const [myTag, setMyTag] = useState<string[]>(userTags);
    const [dynamicTagCounts, setDynamicTagCounts] = useState<Record<string, number>>(initialTagCounts ?? {});
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const messages = useMessages();
    const router = useRouter();
    const loader = useTopLoader();
    const pathname = usePathname();

    // App Router 用: クエリパラメータを取得
    const searchParams = useSearchParams();

    // 選択タグに基づいて関連タグを取得（ユーザー固有）
    const fetchRelatedTags = useCallback(async (selectedTags: string[]) => {
        try {
            const params = new URLSearchParams();
            params.set('actor', did);
            if (selectedTags.length > 0) {
                params.set('tags', selectedTags.join(','));
            }

            const res = await fetch(`/xrpc/blue.rito.feed.getLatestBookmarkTag?${params.toString()}`);
            if (res.ok) {
                const data: TagRanking[] = await res.json();
                // タグリストを更新（APIから返されたタグのみ表示）
                const tagNames = data.map(r => r.tag);
                setMyTag(tagNames);
                // 件数マップを更新
                setDynamicTagCounts(Object.fromEntries(data.map(r => [r.tag, r.count])));
            }
        } catch (err) {
            console.error("Error fetching related tags:", err);
        }
    }, [did]);

    useEffect(() => {
        if (!searchParams) return;

        const tagParam = searchParams.get('tag');
        const initialTags = tagParam ? tagParam.split(',') : [];
        setTags(initialTags);

        // 初期ロード時に関連タグを取得
        fetchRelatedTags(initialTags);
    }, [searchParams, fetchRelatedTags]);

    // タグ変更時に関連タグを再取得
    useEffect(() => {
        fetchRelatedTags(tags);
    }, [tags, fetchRelatedTags]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const params = new URLSearchParams();
        if (tags.length) params.set('tag', tags.join(','));

        loader.start();
        router.push(`?${params.toString()}`);
        setIsLoading(false);
    };

    const handleCopy = async () => {
        const url = `${window.location.origin}${pathname}?${searchParams.toString()}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // 2秒後にリセット
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <Group grow mb="xs" align="top" gap={16}>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {/* 左側: User */}
                    <User did={did} />

                    {/* 右側: タグ入力とサジェッション */}
                    <SimpleGrid spacing="md">
                        <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <TagsInput
                                label={messages.search.field.tag.title}
                                placeholder={messages.search.field.tag.placeholder}
                                value={tags}
                                onChange={(newTags) => {
                                    const filtered = newTags.map(tag => tag.replace(/#/g, ""));
                                    setTags(filtered);
                                }}
                                styles={{ input: { fontSize: 16 } }}
                                clearable
                            />

                            <TagSuggestion
                                tags={myTag}
                                selectedTags={tags}
                                setTags={setTags}
                                tagCounts={dynamicTagCounts}
                            />
                        </Box>
                    </SimpleGrid>
                </SimpleGrid>
            </Group>

            <Group justify="center" mb="xs">
                <Button
                    type="submit"
                    loading={isLoading}
                    leftSection={<Search size={14} />}
                >
                    {messages.search.button.search}
                </Button>
                <Button
                    color={copied ? "teal" : "gray"}
                    onClick={handleCopy}
                    leftSection={<ClipboardPaste size={14} />}
                >
                    {copied ? messages.search.button.urlcopyed : messages.search.button.urlcopy}
                </Button>
            </Group>
        </form>
    );
}
