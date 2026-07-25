import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferenceState {
  unblurModerationCategories: string[];
  setUnblurModerationCategories: (categories: string[]) => void;
  isHydrated: boolean;
  setHydrated: (state: boolean) => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      unblurModerationCategories: [],
      setUnblurModerationCategories: (categories) => set({ unblurModerationCategories: categories }),
      isHydrated: false,
      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: 'rito-preference-store',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
