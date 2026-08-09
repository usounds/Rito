'use client';
import { Button, Checkbox, Group, TagsInput, SimpleGrid, Box, Select, ActionIcon, Tooltip } from '@mantine/core';
import { Search, RotateCw, LayoutGrid, List } from 'lucide-react';
import { useMessages } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from "next/navigation";
import { ClipboardPaste } from 'lucide-react';
import { TagSuggestion } from "@/components/TagSuggest";
import { useXrpcAgentStore } from "@/state/XrpcAgent";
import { TagRanking } from '@/type/ApiTypes';
import { notifications } from '@mantine/notifications';

type SearchFormProps = {
  locale: string;
  defaultTags?: string[];
  defaultHandles?: string[];
  defaultRelationship?: string;
};

export function SearchForm({
  locale,
  defaultTags = [],
  defaultHandles = [],
  defaultRelationship = 'all',
}: SearchFormProps) {
  const [tags, setTags] = useState<string[]>(defaultTags);
  const [myTag, setMyTag] = useState<string[]>([]);
  const [dynamicTagCounts, setDynamicTagCounts] = useState<Record<string, number>>({});
  const [handles, setHandles] = useState<string[]>(defaultHandles);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const publicAgent = useXrpcAgentStore(state => state.publicAgent);
  const activeDid = useXrpcAgentStore(state => state.activeDid);
  const lastSyncedAt = useXrpcAgentStore(state => state.lastSyncedAt);
  const setLastSyncedAt = useXrpcAgentStore(state => state.setLastSyncedAt);
  const isLoginProcess = useXrpcAgentStore(state => state.isLoginProcess);
  const [commentPriority, setCommentPriority] = useState('comment');
  const [relationship, setRelationship] = useState<string>(defaultRelationship);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const messages = useMessages();
  const router = useRouter();
  const loader = useTopLoader();
  const pathname = usePathname();

  const searchParams = useSearchParams();

  useEffect(() => {
    const savedMode = localStorage.getItem('rito_bookmark_view_mode') as 'grid' | 'list' | null;
    if (savedMode === 'grid' || savedMode === 'list') {
      setViewMode(savedMode);
    }
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('rito_bookmark_view_mode', mode);
    window.dispatchEvent(new Event('rito_view_mode_changed'));
  };

  const fetchRelatedTags = useCallback(async (selectedTags: string[], targetHandles?: string[], targetRelationship?: string) => {
    try {
      const params = new URLSearchParams();
      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.join(','));
      }
      const handlesToUse = targetHandles !== undefined ? targetHandles : handles;
      const relationshipToUse = targetRelationship !== undefined ? targetRelationship : relationship;

      if (relationshipToUse === 'specified' && handlesToUse.length > 0) {
        params.set('actor', handlesToUse.join(','));
      } else if (relationshipToUse !== 'all' && activeDid) {
        params.set('relationship', relationshipToUse);
        params.set('actor', activeDid);
      }

      const res = await fetch(`/xrpc/blue.rito.feed.getLatestBookmarkTag?${params.toString()}`);
      if (res.ok) {
        const data: TagRanking[] = await res.json();
        let tagNames = data.map(r => r.tag);
        if (selectedTags.length === 0 && !tagNames.includes("Verified")) {
          tagNames = ["Verified", ...tagNames];
        }
        setMyTag(tagNames);
        setDynamicTagCounts(Object.fromEntries(data.map(r => [r.tag, r.count])));
      }
    } catch (err) {
      console.error("Error fetching related tags:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDid]);

  useEffect(() => {
    if (!searchParams) return;

    const tagParam = searchParams.get('tag');
    const handleParam = searchParams.get('handle');
    const relParam = searchParams.get('relationship');

    setCommentPriority(searchParams.get('comment') || 'comment');
    const initialTags = tagParam ? tagParam.split(',') : [];
    setTags(initialTags);
    const initialHandles = handleParam ? handleParam.split(',') : [];
    setHandles(initialHandles);

    let initialRel = 'all';
    if (relParam) initialRel = relParam;
    else if (handleParam) initialRel = 'specified';
    setRelationship(initialRel);

    fetchRelatedTags(initialTags, initialHandles, initialRel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    fetchRelatedTags(tags);
  }, [tags, handles, relationship, fetchRelatedTags]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const params = new URLSearchParams();
    if (tags.length) params.set('tag', tags.join(','));
    if (commentPriority === 'ogp') params.set('comment', commentPriority);

    if (relationship === 'specified') {
      if (handles.length) params.set('handle', handles.join(','));
    } else if (relationship !== 'all') {
      params.set('relationship', relationship);
    }

    loader.start();
    router.push(`/${locale}/bookmark/search?${params.toString()}`);
    setIsLoading(false);
  };

  const handleCopy = async () => {
    const url = `${window.location.origin}${pathname}?${searchParams.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        setSuggestions(res.data.actors.map((a) => a.handle));
      }
    } catch (err) {
      console.error("searchActorsTypeahead error", err);
    }
  };

  const handleSync = async () => {
    if (!activeDid) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/graph/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'both' }),
      });
      if (res.ok) {
        setLastSyncedAt(Date.now());
        notifications.show({
          title: messages.search.field.sync.success,
          message: '',
          color: 'teal',
        });
      } else {
        throw new Error('Failed');
      }
    } catch {
      notifications.show({
        title: messages.search.field.sync.error,
        message: '',
        color: 'red',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const relationshipOptions = [
    { value: 'all', label: messages.search.field.mode.all },
    { value: 'specified', label: messages.search.field.mode.specified },
    { value: 'following', label: messages.search.field.mode.following, disabled: !activeDid },
    { value: 'followers', label: messages.search.field.mode.followers, disabled: !activeDid },
    { value: 'mutual', label: messages.search.field.mode.mutual, disabled: !activeDid },
  ];

  return (
    <form onSubmit={handleSubmit}>
      <Group grow mb="xs">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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

          <Box>
            <Select
              label={messages.search.field.mode.title}
              data={relationshipOptions}
              value={relationship}
              onChange={(val) => {
                const mode = val || 'all';
                setRelationship(mode);
                if (mode !== 'all' && mode !== 'specified' && activeDid) {
                  handleSync();
                }
              }}
              mb="xs"
              allowDeselect={false}
            />

            {relationship === 'specified' ? (
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
            ) : (relationship !== 'all' && activeDid) ? (
              <Box>
                <Group align="center">
                  <Button
                    onClick={handleSync}
                    loading={isSyncing}
                    disabled={isLoginProcess}
                    variant="light"
                    leftSection={<RotateCw size={16} />}
                    fullWidth
                  >
                    {messages.search.field.sync.button}
                  </Button>
                </Group>
                {lastSyncedAt && (
                  <Box mt={4} ta="right" fz="xs" c="dimmed">
                    {messages.search.field.sync.lastSynced}: {new Date(lastSyncedAt).toLocaleString()}
                  </Box>
                )}
              </Box>
            ) : null}
          </Box>
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

      <Group justify="space-between" align="center" mb="md">
        <Group gap="xs">
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

        <Group gap={4}>
          <Tooltip label="カード（グリッド）表示">
            <ActionIcon
              variant={viewMode === 'grid' ? 'filled' : 'light'}
              color="blue"
              size="md"
              onClick={() => handleViewModeChange('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="リスト表示">
            <ActionIcon
              variant={viewMode === 'list' ? 'filled' : 'light'}
              color="blue"
              size="md"
              onClick={() => handleViewModeChange('list')}
              aria-label="List view"
            >
              <List size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </form>
  );
}
