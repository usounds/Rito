import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PreferenceState = {
  isDeveloper: boolean;
};

type PreferenceAction = {
  setIsDeveloper: (value: boolean) => void;
};

export const usePreferenceStore = create<PreferenceState & PreferenceAction>()(
  persist(
    (set) => ({
      isDeveloper: false, // 初期値 false
      setIsDeveloper: (value: boolean) => set({ isDeveloper: value }),
    }),
    {
      name: 'preference-store', // localStorage に保存されるキー名
    }
  ) as any
);
