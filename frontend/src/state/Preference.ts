import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferenceState {
  unblurModerationCategories: string[];
  setUnblurModerationCategories: (categories: string[]) => void;
  termsNoticeAcknowledgedRevisionDate: string | null;
  privacyNoticeAcknowledgedRevisionDate: string | null;
  setTermsNoticeAcknowledgedRevisionDate: (revisionDate: string | null) => void;
  setPrivacyNoticeAcknowledgedRevisionDate: (revisionDate: string | null) => void;
  legalAcknowledgementsLoaded: boolean;
  setLegalAcknowledgementsLoaded: (state: boolean) => void;
  legalAcknowledgementsFetchedFromPreference: boolean;
  setLegalAcknowledgementsFetchedFromPreference: (state: boolean) => void;
  isHydrated: boolean;
  setHydrated: (state: boolean) => void;
}

export const usePreferenceStore = create<PreferenceState>()(
  persist(
    (set) => ({
      unblurModerationCategories: [],
      setUnblurModerationCategories: (categories) => set({ unblurModerationCategories: categories }),
      termsNoticeAcknowledgedRevisionDate: null,
      privacyNoticeAcknowledgedRevisionDate: null,
      setTermsNoticeAcknowledgedRevisionDate: (revisionDate) => set({ termsNoticeAcknowledgedRevisionDate: revisionDate }),
      setPrivacyNoticeAcknowledgedRevisionDate: (revisionDate) => set({ privacyNoticeAcknowledgedRevisionDate: revisionDate }),
      legalAcknowledgementsLoaded: false,
      setLegalAcknowledgementsLoaded: (state) => set({ legalAcknowledgementsLoaded: state }),
      legalAcknowledgementsFetchedFromPreference: false,
      setLegalAcknowledgementsFetchedFromPreference: (state) => set({ legalAcknowledgementsFetchedFromPreference: state }),
      isHydrated: false,
      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: 'rito-preference-store',
      partialize: (state) => ({
        unblurModerationCategories: state.unblurModerationCategories,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
