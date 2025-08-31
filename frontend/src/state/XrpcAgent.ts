
import { OAuthUserAgent } from '@atcute/oauth-browser-client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  oauthUserAgent: OAuthUserAgent | null;
  did: string | null;
  handle: string[] | null;
};

type Action = {
  setOauthUserAgent: (oauthUserAgent: OAuthUserAgent | null) => void;
  setDid: (did: string | null) => void;
  setHandle: (handle: string[] | null) => void;
  addHandle: (newHandle: string) => void;
  removeHandle: (target: string) => void;
};

export const useXrpcAgentStore = create<State & Action>()(
  persist(
    (set, get) => ({
      oauthUserAgent: null,
      did: null,
      handle: null,
      setHandle: (handle: string[] | null) => set({ handle }),
      setDid: (did: string | null) => set({ did }),
      setOauthUserAgent: (agent: OAuthUserAgent | null) => set({ oauthUserAgent: agent }),

      addHandle: (newHandle: string) => {
        const current = get().handle || [];
        if (!current.includes(newHandle)) {
          set({ handle: [...current, newHandle] });
        }
      },

      removeHandle: (target: string) => {
        const current = get().handle || [];
        set({ handle: current.filter(h => h !== target) });
      },
    }),
    {
      name: 'xrpc-store',
      partialize: (state) => ({ did: state.did, handle: state.handle }),
    }
  )
);
