import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PreferenceState = {
  isDeveloper: boolean;
  isPostToBluesky: boolean;
  isUseOriginalLink: boolean;
};

type PreferenceAction = {
  setIsDeveloper: (value: boolean) => void;
  setIsPostToBluesky: (value: boolean) => void;
  setIsUseOriginalLink: (value: boolean) => void;
};

export const usePreferenceStore = create<PreferenceState & PreferenceAction>()(
  persist(
    (set) => ({
      isDeveloper: false,
      isPostToBluesky: false,
      isUseOriginalLink: false,
      setIsDeveloper: (value: boolean) => set({ isDeveloper: value }),
      setIsPostToBluesky: (value: boolean) => set({ isPostToBluesky: value }),
      setIsUseOriginalLink: (value: boolean) => set({ isUseOriginalLink: value }),
    }),
    {
      name: 'preference-store',
    }
  ) as any
);

