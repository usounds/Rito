import { create } from 'zustand';
import { PrivateBookmarkItem, PdsCapabilityStatus } from '@/logic/privateBookmark/types';

interface PrivateBookmarkState {
  bookmarks: PrivateBookmarkItem[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  capabilityStatus: PdsCapabilityStatus;
  statusMessage: string | null;
  loadedForDid: string | null;
}

interface PrivateBookmarkActions {
  setBookmarks: (bookmarks: PrivateBookmarkItem[], cursor: string | null, hasMore: boolean) => void;
  appendBookmarks: (bookmarks: PrivateBookmarkItem[], cursor: string | null, hasMore: boolean) => void;
  addBookmark: (bookmark: PrivateBookmarkItem) => void;
  updateBookmark: (rkey: string, bookmark: Partial<PrivateBookmarkItem>) => void;
  removeBookmark: (rkey: string) => void;
  setLoading: (isLoading: boolean) => void;
  setLoadingMore: (isLoadingMore: boolean) => void;
  setError: (error: string | null) => void;
  setCapabilityStatus: (status: PdsCapabilityStatus, message?: string | null) => void;
  setLoadedForDid: (did: string | null) => void;
  reset: () => void;
}

const initialState: PrivateBookmarkState = {
  bookmarks: [],
  cursor: null,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  capabilityStatus: 'idle',
  statusMessage: null,
  loadedForDid: null,
};

export const usePrivateBookmark = create<PrivateBookmarkState & PrivateBookmarkActions>((set) => ({
  ...initialState,

  setBookmarks: (bookmarks, cursor, hasMore) =>
    set({ bookmarks, cursor, hasMore, error: null }),

  appendBookmarks: (newBookmarks, cursor, hasMore) =>
    set((state) => ({
      bookmarks: [...state.bookmarks, ...newBookmarks],
      cursor,
      hasMore,
      error: null,
    })),

  addBookmark: (bookmark) =>
    set((state) => ({
      bookmarks: [bookmark, ...state.bookmarks],
    })),

  updateBookmark: (rkey, updated) =>
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.rkey === rkey ? { ...b, ...updated } : b
      ),
    })),

  removeBookmark: (rkey) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.rkey !== rkey),
    })),

  setLoading: (isLoading) => set({ isLoading }),
  setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),
  setError: (error) => set({ error }),
  setCapabilityStatus: (capabilityStatus, statusMessage = null) =>
    set({ capabilityStatus, statusMessage }),
  setLoadedForDid: (loadedForDid) => set({ loadedForDid }),
  reset: () => set(initialState),
}));
