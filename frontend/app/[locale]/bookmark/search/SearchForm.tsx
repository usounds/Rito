'use client';
import { Button, Group, TagsInput, Checkbox } from '@mantine/core';
import { Search } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTopLoader } from 'nextjs-toploader';

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
  const messages = useMessages();
  const router = useRouter();
  const loader = useTopLoader();

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

  return (
    <form onSubmit={handleSubmit}>
      <Group grow mb="xs">
        <TagsInput
          label={messages.search.field.tag.title}
          placeholder={messages.search.field.tag.placeholder}
          value={tags}
          onChange={setTags}
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
      </Group>
    </form>
  );
}
