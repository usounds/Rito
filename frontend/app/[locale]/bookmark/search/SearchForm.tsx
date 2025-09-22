'use client';
import { Button, Checkbox, Group, TagsInput, SimpleGrid } from '@mantine/core';
import { Search } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useEffect, useState } from 'react';
import { usePathname } from "next/navigation";
import { ClipboardPaste } from 'lucide-react';

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
  const [handles, setHandles] = useState<string[]>(defaultHandles);
  const [commentPriority, setCommentPriority] = useState(false);
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
    const handleParam = searchParams.get('handle');

    setCommentPriority(searchParams.get('comment') === 'true');
    setTags(tagParam ? tagParam.split(',') : []);
    setHandles(handleParam ? handleParam.split(',') : []);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const params = new URLSearchParams();
    if (tags.length) params.set('tag', tags.join(','));
    if (handles.length) params.set('handle', handles.join(','));
    if (commentPriority) params.set('comment', 'true');

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

  return (
    <form onSubmit={handleSubmit}>
      <Group grow mb="xs">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <TagsInput
            label={messages.search.field.tag.title}
            placeholder={messages.search.field.tag.placeholder}
            value={tags}
            onChange={(newTags) => {
              // '#' を削除してから state にセット
              const filtered = newTags.map(tag => tag.replace(/#/g, ""));
              setTags(filtered);
            }}
            styles={{ input: { fontSize: 16 } }}
            clearable
          />
          <TagsInput
            label={messages.search.field.user.title}
            placeholder={messages.search.field.user.placeholder}
            value={handles}
            onChange={setHandles}
            styles={{ input: { fontSize: 16 } }}
            clearable
          />
        </SimpleGrid>
      </Group>

      <Group mb="xs">
        <Checkbox
          label={messages.search.field.commentpriority.title}
          checked={commentPriority}
          onChange={(e) => setCommentPriority(e.currentTarget.checked)}
        />
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
