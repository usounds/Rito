import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppBskyActorDefs } from '@atcute/bluesky';
import { Client, simpleFetchHandler } from '@atcute/client';

type State = {
  activeDid: string | null;
  handle: string | null;
  userProf: AppBskyActorDefs.ProfileViewDetailed | null;
  publicAgent: Client;
  thisClient: Client;
  isLoginProcess: boolean;
};

type Action = {
  setActiveDid: (did: string | null) => void;
  setHandle: (handle: string | null) => void;
  setUserProf: (userProf: AppBskyActorDefs.ProfileViewDetailed | null) => void;
  setPublicAgent: (publicAgent: Client) => void;
  setThisClient: (thisClient: Client) => void;
  setIsLoginProcess: (isLoginProcess: boolean) => void;
};

export const useXrpcAgentStore = create<State & Action>()(
  persist(
    (set) => ({
      activeDid: null,
      handle: null,
      userProf: null,
      publicAgent: new Client({
        handler: simpleFetchHandler({
          service: 'https://public.api.bsky.app',
        }),
      }),
      thisClient: new Client({
        handler: simpleFetchHandler({
          service: `${process.env.NEXT_PUBLIC_URL}`,
        }),
      }),
      isLoginProcess: false,

      setActiveDid: (did: string | null) => set({ activeDid: did }),
      setHandle: (handle: string | null) => set({ handle }),
      setUserProf: (userProf: AppBskyActorDefs.ProfileViewDetailed | null) =>
        set({ userProf }),
      setPublicAgent: (publicAgent: Client) => set({ publicAgent }),
      setThisClient: (thisClient: Client) => set({ thisClient }),
      setIsLoginProcess: (isLoginProcess: boolean) => set({ isLoginProcess }),
    }),
    {
      name: 'xrpc-agent-store',
      partialize: (state: State & Action) => ({
        activeDid: state.activeDid,
        handle: state.handle,
        isLoginProcess: state.isLoginProcess,
      }),
    }
  ) as any
);
