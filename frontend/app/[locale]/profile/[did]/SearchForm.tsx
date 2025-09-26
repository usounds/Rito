'use client';
import { Button, Checkbox, Group, TagsInput, SimpleGrid, Box } from '@mantine/core';
import { Search } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useEffect, useState } from 'react';
import { usePathname } from "next/navigation";
import { ClipboardPaste } from 'lucide-react';
import { useMyBookmark } from "@/state/MyBookmark";
import { TagSuggestion } from "@/components/TagSuggest";
import User from "@/components/user/User";

type SearchFormProps = {
    locale: string;
    defaultTags?: string[];
    userTags?: string[];
    did: string;
};

export function SearchForm({
    locale,
    defaultTags = [],
    userTags = [],
    did,
}: SearchFormProps) {
    const [tags, setTags] = useState<string[]>(defaultTags);
    const [myTag, setMyTag] = useState<string[]>([]);
    const tagRanking = useMyBookmark(state => state.tagRanking);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const messages = useMessages();
    const router = useRouter();
    const loader = useTopLoader();
    const pathname = usePathname();

    // App Router 用: クエリパラメータを取得
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!searchParams) return;

        const tagParam = searchParams.get('tag');
        setMyTag(userTags);

        setTags(tagParam ? tagParam.split(',') : []);
    }, [searchParams, tagRanking]);

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
                        />
                    </Box>
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
