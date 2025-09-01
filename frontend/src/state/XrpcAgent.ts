import { OAuthUserAgent } from '@atcute/oauth-browser-client';
import { Client } from '@atcute/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppBskyActorDefs } from '@atcute/bluesky';

type Identity = {
  did: string;
  handle: string;
};

type State = {
  oauthUserAgent: OAuthUserAgent | null;
  client: Client | null;
  identities: Identity[];     // DID と handle のペア
  activeDid: string | null;   // 現在アクティブな DID
  userProf: AppBskyActorDefs.ProfileViewDetailed | null;
};

type Action = {
  setOauthUserAgent: (oauthUserAgent: OAuthUserAgent | null) => void;
  setAgent: (client: Client | null) => void;
  addIdentity: (did: string, handle: string) => void;
  removeIdentity: (did: string) => void;
  setActiveDid: (did: string | null) => void;
  updateHandle: (did: string, newHandle: string) => void;
  setUserProf: (userProf: AppBskyActorDefs.ProfileViewDetailed | null) => void;
};

export const useXrpcAgentStore = create<State & Action>()(
  persist(
    (set, get) => ({
      oauthUserAgent: null,
      identities: [],
      activeDid: null,
      client: null,
      userProf: null,

      setOauthUserAgent: (oauthUserAgent: OAuthUserAgent | null) =>
        set({ oauthUserAgent: oauthUserAgent }),

      setAgent: (client: Client | null) =>
        set({ client: client }),

      setUserProf: (userProf: AppBskyActorDefs.ProfileViewDetailed | null) =>
        set({ userProf: userProf }),

      addIdentity: (did, handle) => {
        const current = get().identities;
        if (!current.some((i) => i.did === did)) {
          set({ identities: [...current, { did, handle }] });
        }
      },

      removeIdentity: (did) => {
        set({
          identities: get().identities.filter((i) => i.did !== did),
          activeDid:
            get().activeDid === did ? null : get().activeDid, // アクティブなら解除
        });
      },

      setActiveDid: (did) => {
        const exists = get().identities.some((i) => i.did === did);
        set({ activeDid: exists ? did : null });
      },

      updateHandle: (did, newHandle) => {
        set({
          identities: get().identities.map((i) =>
            i.did === did ? { ...i, handle: newHandle } : i
          ),
        });
      },
    }),
    {
      name: 'xrpc-store',
      partialize: (state) => ({
        identities: state.identities,
        activeDid: state.activeDid,
      }),
    }
  )
);
