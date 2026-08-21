import { describe, it, expect, beforeEach } from 'vitest';
import { usePrivateBookmark } from '../PrivateBookmark';
import { PrivateBookmarkItem } from '@/logic/privateBookmark/types';

describe('usePrivateBookmark store', () => {
  beforeEach(() => {
    usePrivateBookmark.getState().reset();
  });

  it('initializes with empty state', () => {
    const state = usePrivateBookmark.getState();
    expect(state.bookmarks).toEqual([]);
    expect(state.cursor).toBeNull();
    expect(state.hasMore).toBe(false);
    expect(state.capabilityStatus).toBe('idle');
  });

  it('sets and appends bookmarks with cursor', () => {
    const item1: PrivateBookmarkItem = {
      uri: 'at://did:plc:test/space/blue.rito.space.bookmark/self/did:plc:test/blue.rito.private.feed.bookmark/1',
      rkey: '1',
      subject: 'https://example.com/1',
      comments: [{ lang: 'ja', title: 'Test 1' }],
      tags: ['test'],
      createdAt: '2026-08-16T00:00:00Z',
    };
    const item2: PrivateBookmarkItem = {
      ...item1,
      rkey: '2',
      uri: 'at://did:plc:test/space/blue.rito.space.bookmark/self/did:plc:test/blue.rito.private.feed.bookmark/2',
      subject: 'https://example.com/2',
    };

    usePrivateBookmark.getState().setBookmarks([item1], 'cursor1', true);
    expect(usePrivateBookmark.getState().bookmarks).toHaveLength(1);
    expect(usePrivateBookmark.getState().cursor).toBe('cursor1');
    expect(usePrivateBookmark.getState().hasMore).toBe(true);

    usePrivateBookmark.getState().appendBookmarks([item2], null, false);
    expect(usePrivateBookmark.getState().bookmarks).toHaveLength(2);
    expect(usePrivateBookmark.getState().cursor).toBeNull();
    expect(usePrivateBookmark.getState().hasMore).toBe(false);
  });

  it('removes bookmark by rkey', () => {
    const item: PrivateBookmarkItem = {
      uri: 'at://did:plc:test/space/blue.rito.space.bookmark/self/did:plc:test/blue.rito.private.feed.bookmark/1',
      rkey: '1',
      subject: 'https://example.com',
      comments: [{ lang: 'ja', title: 'Test' }],
      tags: [],
      createdAt: '2026-08-16T00:00:00Z',
    };
    usePrivateBookmark.getState().setBookmarks([item], null, false);
    expect(usePrivateBookmark.getState().bookmarks).toHaveLength(1);

    usePrivateBookmark.getState().removeBookmark('1');
    expect(usePrivateBookmark.getState().bookmarks).toHaveLength(0);
  });

  it('updates capability status', () => {
    usePrivateBookmark.getState().setCapabilityStatus('unsupported', 'PDS not ready');
    expect(usePrivateBookmark.getState().capabilityStatus).toBe('unsupported');
    expect(usePrivateBookmark.getState().statusMessage).toBe('PDS not ready');
  });

  it('resets state completely', () => {
    usePrivateBookmark.getState().setCapabilityStatus('ready');
    usePrivateBookmark.getState().setError('some error');
    usePrivateBookmark.getState().reset();
    expect(usePrivateBookmark.getState().capabilityStatus).toBe('idle');
    expect(usePrivateBookmark.getState().error).toBeNull();
  });
});
