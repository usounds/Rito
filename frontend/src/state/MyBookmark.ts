import { create } from 'zustand';
import { Bookmark } from '@/type/ApiTypes';

type State = {
  myBookmark: Bookmark[];
  isNeedReload: boolean;
};

type Action = {
  setMyBookmark: (bookmarks: Bookmark[]) => void;
  setIsNeedReload: (isNeedReload: boolean) => void;
};

export const useMyBookmark = create<State & Action>((set) => ({
  myBookmark: [],
  isNeedReload: false,

  setMyBookmark: (bookmarks) => set({ myBookmark: bookmarks }),
  setIsNeedReload: (isNeedReload) => set({ isNeedReload }),
}));
