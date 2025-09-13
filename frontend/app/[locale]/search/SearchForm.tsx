'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TagsInput, Button, Group } from '@mantine/core'
import { useLocale, useMessages } from 'next-intl';
import { Search } from 'lucide-react';

type SearchFormProps = {
    locale: string;
    defaultTags?: string[];
    defaultHandles?: string[];
};

export function SearchForm({ locale, defaultTags, defaultHandles }: SearchFormProps) {
    const [tags, setTags] = useState<string[]>(defaultTags ?? []);
    const [handles, setHandles] = useState<string[]>(defaultHandles ?? []);
    const [isLoading, setIsLoading] = useState(false);
    const messages = useMessages();
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const params = new URLSearchParams();
        tags.forEach((t) => params.append('tag', t));
        handles.forEach((h) => params.append('handle', h));

        router.push(`/${locale}/search?${params.toString()}`);
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
                    clearable
                />
                <TagsInput
                    label={messages.search.field.user.title}
                    placeholder={messages.search.field.user.placeholder}
                    value={handles}
                    onChange={setHandles}
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
