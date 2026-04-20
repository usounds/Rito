'use client';
import { Button, Group, TagsInput, Box, Stack } from '@mantine/core';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useEffect, useState, useCallback, useMemo } from 'react';
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
    // App Router 用: クエリパラメータを取得
    const searchParams = useSearchParams();
    
    // searchParams から初期タグを計算
    const initialTagsFromParams = useMemo(() => {
        const tagParam = searchParams?.get('tag');
        return tagParam ? tagParam.split(',') : defaultTags;
    }, [searchParams, defaultTags]);

    const [tags, setTags] = useState<string[]>(initialTagsFromParams);
    const [myTag, setMyTag] = useState<string[]>(userTags);
    const [dynamicTagCounts, setDynamicTagCounts] = useState<Record<string, number>>(initialTagCounts ?? {});
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const t = useTranslations('search');
    const router = useRouter();
    const loader = useTopLoader();
    const pathname = usePathname();

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

    // initialTagsFromParams の文字列化（無限ループ防止）
    const initialTagsKey = JSON.stringify(initialTagsFromParams);

    // URLやPropsが変わった時に tags を同期
    useEffect(() => {
        setTags(JSON.parse(initialTagsKey));
    }, [initialTagsKey]);

    // 初期ロードおよびタグ変更時に関連タグを再取得
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
        const url = `${window.location.origin}${pathname}?${searchParams?.toString() || ''}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // 2秒後にリセット
        } catch (err) {
            console.error("Failed to copy: ", err);
        }
    };

    return (
        <Box mb="xl">
            <User did={did} />
            
            <form onSubmit={handleSubmit}>
                <Stack gap="md">
                    <TagsInput
                        label={t('field.tag.title')}
                        placeholder={t('field.tag.placeholder')}
                        data={myTag}
                        value={tags}
                        onChange={setTags}
                        clearable
                        maxTags={10}
                        leftSection={<Search size={16} />}
                        styles={{
                            input: {
                                borderRadius: '12px',
                            }
                        }}
                    />

                    {tags.length > 0 && (
                        <TagSuggestion 
                            tags={myTag}
                            selectedTags={tags} 
                            setTags={setTags} 
                            tagCounts={dynamicTagCounts}
                        />
                    )}

                    <Group justify="flex-end">
                        <Button
                            variant="subtle"
                            color="gray"
                            leftSection={<ClipboardPaste size={16} />}
                            onClick={handleCopy}
                            disabled={copied}
                        >
                            {copied ? t('button.urlcopyed') : t('button.urlcopy')}
                        </Button>
                        <Button
                            type="submit"
                            loading={isLoading}
                            leftSection={<Search size={16} />}
                            radius="xl"
                        >
                            {t('button.search')}
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Box>
    );
}
