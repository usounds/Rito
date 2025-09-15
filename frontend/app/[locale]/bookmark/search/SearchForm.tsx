'use client';
import { Button, Group, TagsInput } from '@mantine/core';
import { Search } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type SearchFormProps = {
  locale: string;
  defaultTags?: string[];
  defaultHandles?: string[];
};

export function SearchForm({ locale, defaultTags = [], defaultHandles = [] }: SearchFormProps) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [handles, setHandles] = useState<string[]>(defaultHandles);
  const [isLoading, setIsLoading] = useState(false);
  const messages = useMessages();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const params = new URLSearchParams();
    if (tags.length) params.set('tag', tags.join(','));
    if (handles.length) params.set('handle', handles.join(','));

    // props で受け取った locale を使う
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
