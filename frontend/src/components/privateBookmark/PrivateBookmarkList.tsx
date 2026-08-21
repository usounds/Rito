"use client";
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  TagsInput,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { Info, LayoutGrid, List, Lock, RefreshCw, Trash2 } from 'lucide-react';
import { useLocale, useMessages } from 'next-intl';
import { notifications } from '@mantine/notifications';
import { useXrpcAgentStore } from '@/state/XrpcAgent';
import { usePrivateBookmark } from '@/state/PrivateBookmark';
import {
  checkSpaceCapability,
  initializeSpace,
  listPrivateBookmarks,
  deletePrivateBookmarkRecord,
  requestPrivateAuthorization,
} from '@/logic/privateBookmark/pdsClient';
import { PrivateBookmarkItem } from '@/logic/privateBookmark/types';
import { TagSuggestion } from '@/components/TagSuggest';
import { Article } from '@/components/bookmarkcard/Article';
import { ArticleListItem } from '@/components/bookmarkcard/ArticleListItem';
import { PdsCapabilityBanner } from './PdsCapabilityBanner';
import { PrivateBadge } from './PrivateBadge';
import { DeletePrivateBookmarkModal } from './DeletePrivateBookmarkModal';
import classes from './PrivateBookmark.module.scss';

export function PrivateBookmarkList() {
  const activeDid = useXrpcAgentStore((state) => state.activeDid);
  const locale = useLocale();
  const messages = useMessages() as any;

  const {
    bookmarks,
    cursor,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    capabilityStatus,
    statusMessage,
    loadedForDid,
    setBookmarks,
    appendBookmarks,
    removeBookmark,
    setLoading,
    setLoadingMore,
    setError,
    setCapabilityStatus,
    setLoadedForDid,
    reset,
  } = usePrivateBookmark();

  const [tags, setTags] = useState<string[]>([]);
  const [query, setQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isInitializing, setIsInitializing] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PrivateBookmarkItem | null>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem('rito_bookmark_view_mode') as 'grid' | 'list' | null;
    if (savedMode === 'grid' || savedMode === 'list') {
      setViewMode(savedMode);
    }
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('rito_bookmark_view_mode', mode);
  };

  // Reset store when activeDid changes
  useEffect(() => {
    if (activeDid && loadedForDid !== activeDid) {
      reset();
      setLoadedForDid(activeDid);
    }
  }, [activeDid, loadedForDid, reset, setLoadedForDid]);

  // Check capability and fetch bookmarks on mount or activeDid
  const fetchBookmarks = useCallback(async () => {
    if (!activeDid) return;
    setLoading(true);
    setError(null);

    try {
      const capResult = await checkSpaceCapability(activeDid);
      setCapabilityStatus(capResult.status, capResult.message);

      if (capResult.status === 'ready') {
        const { bookmarks: initialBookmarks, cursor: nextCursor, error: fetchErr } =
          await listPrivateBookmarks(activeDid, null);
        if (fetchErr) {
          setError(fetchErr);
        } else {
          setBookmarks(initialBookmarks, nextCursor, !!nextCursor);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize private bookmarks');
    } finally {
      setLoading(false);
    }
  }, [activeDid, setBookmarks, setCapabilityStatus, setError, setLoading]);

  useEffect(() => {
    if (activeDid) {
      fetchBookmarks();
    }
  }, [activeDid, fetchBookmarks]);

  // Handle Space creation
  const handleInitializeSpace = async () => {
    if (!activeDid) return;
    setIsInitializing(true);
    try {
      const result = await initializeSpace(activeDid);
      if (result.success) {
        notifications.show({
          title: 'Spaceを作成しました',
          message: 'プライベートブックマーク機能が有効になりました。',
          color: 'green',
        });
        await fetchBookmarks();
      } else {
        notifications.show({
          title: 'Space作成に失敗しました',
          message: result.error || 'PDSでSpaceの作成に失敗しました。',
          color: 'red',
        });
      }
    } finally {
      setIsInitializing(false);
    }
  };

  // Handle pagination
  const handleLoadMore = async () => {
    if (!activeDid || !cursor || isLoadingMore) return;
    setLoadingMore(true);
    try {
      const { bookmarks: moreBookmarks, cursor: nextCursor, error: fetchErr } =
        await listPrivateBookmarks(activeDid, cursor);
      if (fetchErr) {
        setError(fetchErr);
      } else {
        appendBookmarks(moreBookmarks, nextCursor, !!nextCursor);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle delete
  const handleConfirmDelete = async () => {
    if (!activeDid || !deletingItem) return;
    const { success, error: delErr } = await deletePrivateBookmarkRecord(activeDid, deletingItem.rkey);
    if (success) {
      removeBookmark(deletingItem.rkey);
      notifications.show({
        title: '削除しました',
        message: 'プライベートブックマークを削除しました。',
        color: 'blue',
      });
    } else {
      notifications.show({
        title: '削除に失敗しました',
        message: delErr || 'PDSからの削除に失敗しました。',
        color: 'red',
      });
    }
  };

  // Handle Step-up OAuth authorization
  const handleAuthorize = async () => {
    try {
      await requestPrivateAuthorization();
    } catch (err: any) {
      notifications.show({
        title: '認可の開始に失敗しました',
        message: err?.message || 'OAuth認可画面への遷移に失敗しました。',
        color: 'red',
      });
    }
  };

  // Aggregated tags from in-memory bookmarks
  const { allTags, tagCounts } = useMemo(() => {
    if (!Array.isArray(bookmarks)) return { allTags: [], tagCounts: {} };
    const counts: Record<string, number> = {};
    bookmarks.forEach((b) => {
      b.tags.forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return { allTags: Object.keys(counts), tagCounts: counts };
  }, [bookmarks]);

  // In-memory filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    if (!Array.isArray(bookmarks)) return [];
    return bookmarks.filter((b) => {
      const hasTags = tags.length === 0 || tags.every((tag) => b.tags.includes(tag));
      const matchesQuery =
        query.trim() === '' ||
        b.comments.some(
          (c) =>
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            (c.comment && c.comment.toLowerCase().includes(query.toLowerCase()))
        );
      return hasTags && matchesQuery;
    });
  }, [bookmarks, tags, query]);

  return (
    <Stack gap="md">
      {/* Capability / Initialization Banner */}
      <PdsCapabilityBanner
        status={capabilityStatus}
        statusMessage={statusMessage}
        onInitializeSpace={handleInitializeSpace}
        onAuthorize={handleAuthorize}
        isInitializing={isInitializing}
      />

      {error && (
        <Alert variant="light" color="red" title="エラーが発生しました" icon={<Info size={18} />}>
          {error}
        </Alert>
      )}

      {capabilityStatus === 'ready' && (
        <>
          <Group justify="space-between" align="flex-end">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" style={{ flex: 1 }}>
              <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <TagsInput
                  label={messages.search?.field?.tag?.title || 'タグ'}
                  placeholder={messages.search?.field?.tag?.placeholder || 'タグで絞り込み'}
                  value={tags}
                  onChange={(newTags) => setTags(newTags.map((tag) => tag.replace(/#/g, '')))}
                  styles={{ input: { fontSize: 16 } }}
                  clearable
                />
                <TagSuggestion
                  tags={allTags}
                  selectedTags={tags}
                  setTags={setTags}
                  tagCounts={tagCounts}
                />
              </Box>
              <TextInput
                label={messages.mybookmark?.field?.search?.title || '単語検索'}
                placeholder={messages.mybookmark?.field?.search?.placeholder || 'ブックマークを検索'}
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                styles={{ input: { fontSize: 16 } }}
              />
            </SimpleGrid>

            <Group gap={6} mb={4}>
              <Tooltip label="再読み込み">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  loading={isLoading}
                  onClick={fetchBookmarks}
                  aria-label="Refresh private bookmarks"
                >
                  <RefreshCw size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="グリッド表示">
                <ActionIcon
                  variant={viewMode === 'grid' ? 'filled' : 'light'}
                  color="indigo"
                  size="lg"
                  onClick={() => handleViewModeChange('grid')}
                  aria-label="Grid view"
                >
                  <LayoutGrid size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="リスト表示">
                <ActionIcon
                  variant={viewMode === 'list' ? 'filled' : 'light'}
                  color="indigo"
                  size="lg"
                  onClick={() => handleViewModeChange('list')}
                  aria-label="List view"
                >
                  <List size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {isLoading && (
            <Center my="xl">
              <Loader color="indigo" size="md" />
            </Center>
          )}

          {!isLoading && bookmarks.length === 0 && (
            <Alert
              my="sm"
              variant="light"
              color="indigo"
              title="非公開のブックマークはありません"
              icon={<Lock size={18} />}
            >
              右下のブックマーク登録ボタンから「🔒 自分のみ」を選択して登録してください。
            </Alert>
          )}

          {!isLoading && filteredBookmarks.length > 0 && (
            <>
              {viewMode === 'grid' ? (
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                  {filteredBookmarks.map((b, index) => {
                    const selectedComment =
                      b.comments.find((c) => c.lang === locale) || b.comments[0];
                    return (
                      <div key={b.rkey} className={classes.articleItem}>
                        <Article
                          url={b.subject}
                          title={selectedComment?.title ?? ''}
                          comment={selectedComment?.comment ?? ''}
                          tags={b.tags}
                          image={b.ogpImage || null}
                          date={new Date(b.createdAt)}
                          moderations={[]}
                          likes={[]}
                          likeDisabled={true}
                          priority={index < 6}
                          badge={<PrivateBadge size="xs" />}
                          actionSection={
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingItem(b);
                              }}
                              aria-label="Delete private bookmark"
                            >
                              <Trash2 size={14} />
                            </ActionIcon>
                          }
                        />
                      </div>
                    );
                  })}
                </SimpleGrid>
              ) : (
                <Stack gap="xs">
                  {filteredBookmarks.map((b, index) => {
                    const selectedComment =
                      b.comments.find((c) => c.lang === locale) || b.comments[0];
                    return (
                      <ArticleListItem
                        key={b.rkey}
                        url={b.subject}
                        title={selectedComment?.title ?? ''}
                        comment={selectedComment?.comment ?? ''}
                        tags={b.tags}
                        image={b.ogpImage || null}
                        date={new Date(b.createdAt)}
                        moderations={[]}
                        likes={[]}
                        likeDisabled={true}
                        priority={index < 6}
                        badge={<PrivateBadge size="xs" />}
                        actionSection={
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingItem(b);
                            }}
                            aria-label="Delete private bookmark"
                          >
                            <Trash2 size={14} />
                          </ActionIcon>
                        }
                      />
                    );
                  })}
                </Stack>
              )}

              {hasMore && (
                <Center my="lg">
                  <Button
                    variant="light"
                    color="violet"
                    loading={isLoadingMore}
                    onClick={handleLoadMore}
                  >
                    さらに読み込む
                  </Button>
                </Center>
              )}
            </>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      <DeletePrivateBookmarkModal
        opened={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title={deletingItem?.comments[0]?.title}
      />
    </Stack>
  );
}
