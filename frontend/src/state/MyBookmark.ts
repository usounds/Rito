import { create } from 'zustand';
import { Bookmark,TagRanking} from '@/type/ApiTypes';

type State = {
  myBookmark: Bookmark[];
  tagRanking: TagRanking[];
  isNeedReload: boolean;
};

type Action = {
  setMyBookmark: (bookmarks: Bookmark[]) => void;
  setIsNeedReload: (isNeedReload: boolean) => void;
  setTagRanking: (tagRanking: TagRanking[]) => void;
};

export const useMyBookmark = create<State & Action>((set) => ({
  myBookmark: [],
  isNeedReload: false,
  tagRanking: [],
  setMyBookmark: (bookmarks) => set({ myBookmark: bookmarks }),
  setIsNeedReload: (isNeedReload) => set({ isNeedReload }),
  setTagRanking: (tagRanking) => set({ tagRanking }),
}));
