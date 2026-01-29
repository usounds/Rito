'use client';
import { Button, Checkbox, Group, TagsInput, SimpleGrid, Box } from '@mantine/core';
import { Search } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from "next/navigation";
import { ClipboardPaste } from 'lucide-react';
import { useMyBookmark } from "@/state/MyBookmark";
import { TagSuggestion } from "@/components/TagSuggest";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { TagRanking } from '@/type/ApiTypes';

type SearchFormProps = {
  locale: string;
  defaultTags?: string[];
  defaultHandles?: string[];
};

export function SearchForm({
  locale,
  defaultTags = [],
  defaultHandles = [],
}: SearchFormProps) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [myTag, setMyTag] = useState<string[]>([]);
  const [dynamicTagCounts, setDynamicTagCounts] = useState<Record<string, number>>({});
  const [handles, setHandles] = useState<string[]>(defaultHandles);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const tagRanking = useMyBookmark(state => state.tagRanking);
  const publicAgent = useXrpcAgentStore(state => state.publicAgent);
  const [commentPriority, setCommentPriority] = useState('comment');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const messages = useMessages();
  const router = useRouter();
  const loader = useTopLoader();
  const pathname = usePathname();

  // App Router 用: クエリパラメータを取得
  const searchParams = useSearchParams();

  // 選択タグに基づいて関連タグを取得
  const fetchRelatedTags = useCallback(async (selectedTags: string[]) => {
    try {
      const url = selectedTags.length > 0
        ? `/xrpc/blue.rito.feed.getLatestBookmarkTag?tags=${encodeURIComponent(selectedTags.join(','))}`
        : `/xrpc/blue.rito.feed.getLatestBookmarkTag`;

      const res = await fetch(url);
      if (res.ok) {
        const data: TagRanking[] = await res.json();
        // タグリストを更新
        let tagNames = data.map(r => r.tag);
        // タグ未選択時のみ Verified を先頭に追加
        if (selectedTags.length === 0 && !tagNames.includes("Verified")) {
          tagNames = ["Verified", ...tagNames];
        }
        setMyTag(tagNames);
        // 件数マップを更新
        setDynamicTagCounts(Object.fromEntries(data.map(r => [r.tag, r.count])));
      }
    } catch (err) {
      console.error("Error fetching related tags:", err);
    }
  }, []);

  useEffect(() => {
    if (!searchParams) return;

    const tagParam = searchParams.get('tag');
    const handleParam = searchParams.get('handle');

    setCommentPriority(searchParams.get('comment') || 'comment');
    const initialTags = tagParam ? tagParam.split(',') : [];
    setTags(initialTags);
    setHandles(handleParam ? handleParam.split(',') : []);

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
    if (handles.length) params.set('handle', handles.join(','));
    if (commentPriority === 'ogp') params.set('comment', commentPriority);

    loader.start();
    router.push(`/${locale}/bookmark/search?${params.toString()}`);
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

  const handleInput = async (event: React.FormEvent<HTMLInputElement>) => {
    const val = event.currentTarget.value;

    if (!val) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await publicAgent.get("app.bsky.actor.searchActorsTypeahead", {
        params: {
          q: val,
          limit: 5,
        },
      });

      if (res.ok) {
        // actor.handle を候補として表示
        setSuggestions(res.data.actors.map((a) => a.handle));
      }
    } catch (err) {
      console.error("searchActorsTypeahead error", err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Group grow mb="xs">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {/* タグ入力とサジェッションを縦並びに */}
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

          {/* ユーザー入力 */}
          <TagsInput
            label={messages.search.field.user.title}
            placeholder={messages.search.field.user.placeholder}
            value={handles}
            data={suggestions}
            onChange={(value) => {
              setHandles(value);
              setSuggestions([]);
            }}
            onInput={handleInput}
            styles={{ input: { fontSize: 16 } }}
            clearable
          />
        </SimpleGrid>
      </Group>

      <Box style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>

        <Checkbox
          label={messages.search.field.commentpriority.title}
          checked={commentPriority === 'ogp'}
          onChange={() =>
            setCommentPriority(commentPriority === 'ogp' ? 'comment' : 'ogp')
          }
        />
      </Box>

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
