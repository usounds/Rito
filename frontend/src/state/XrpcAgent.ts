
import { OAuthUserAgent } from '@atcute/oauth-browser-client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
    oauthUserAgent: OAuthUserAgent | null;
    did: string | null;
};

type Action = {
  setOauthUserAgent: (oauthUserAgent:  OAuthUserAgent | null) => void;
  setDid: (did:  string | null) => void;
};

export const useXrpcAgentStore = create<State & Action>()(
  persist(
    (set) => ({
      oauthUserAgent: null,
      did: null,
      locale: 'en',

      setDid: (did) => set({ did }),
      setOauthUserAgent: (agent) => set({ oauthUserAgent: agent }),
    }),
    {
      name: 'xrpc-store',
      partialize: (state) => ({ did: state.did }), 
    }
  )
);