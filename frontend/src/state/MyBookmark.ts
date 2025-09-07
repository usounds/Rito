import { Bookmark } from '@/type/ApiTypes';
import { create } from 'zustand';

type State = {
  myBookmark: Bookmark[];
};

type Action = {
  setMyBookmark: (bookmarks: Bookmark[]) => void;
};

export const useMyBookmark = create<State & Action>((set) => ({
  myBookmark: [],

  setMyBookmark: (bookmarks: Bookmark[]) =>
    set({ myBookmark: bookmarks }),
}));
