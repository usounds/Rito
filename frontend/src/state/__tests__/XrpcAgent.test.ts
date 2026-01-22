import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@atcute/client';

// Mock Client with proper class implementation
vi.mock('@atcute/client', () => {
    return {
        Client: class MockClient {
            constructor() { }
            get = vi.fn();
            post = vi.fn();
        },
        simpleFetchHandler: vi.fn().mockReturnValue({}),
    };
});

import { useXrpcAgentStore } from '../XrpcAgent';

describe('Store: XrpcAgent', () => {
    beforeEach(() => {
        // Reset store state
        useXrpcAgentStore.setState({
            activeDid: null,
            handle: null,
            userProf: null,
            isLoginProcess: false,
        });
    });

    it('初期状態が正しい', () => {
        const state = useXrpcAgentStore.getState();
        expect(state.activeDid).toBeNull();
        expect(state.handle).toBeNull();
        expect(state.userProf).toBeNull();
        expect(state.isLoginProcess).toBe(false);
    });

    it('setActiveDidでDIDを設定', () => {
        useXrpcAgentStore.getState().setActiveDid('did:plc:testuser');
        expect(useXrpcAgentStore.getState().activeDid).toBe('did:plc:testuser');
    });

    it('setHandleでハンドルを設定', () => {
        useXrpcAgentStore.getState().setHandle('user.bsky.social');
        expect(useXrpcAgentStore.getState().handle).toBe('user.bsky.social');
    });

    it('setUserProfでプロファイルを設定', () => {
        const profile = {
            did: 'did:plc:testuser',
            handle: 'user.bsky.social',
            displayName: 'Test User',
        };
        useXrpcAgentStore.getState().setUserProf(profile as never);
        expect(useXrpcAgentStore.getState().userProf).toEqual(profile);
    });

    it('setIsLoginProcessでログイン状態を設定', () => {
        useXrpcAgentStore.getState().setIsLoginProcess(true);
        expect(useXrpcAgentStore.getState().isLoginProcess).toBe(true);
    });

    it('nullでクリアできる', () => {
        useXrpcAgentStore.getState().setActiveDid('did:plc:testuser');
        useXrpcAgentStore.getState().setActiveDid(null);
        expect(useXrpcAgentStore.getState().activeDid).toBeNull();
    });

    it('publicAgentが初期化されている', () => {
        const state = useXrpcAgentStore.getState();
        expect(state.publicAgent).toBeDefined();
    });

    it('thisClientが初期化されている', () => {
        const state = useXrpcAgentStore.getState();
        expect(state.thisClient).toBeDefined();
    });

    it('setPublicAgentでPublicAgentを更新できる', () => {
        const newAgent = new Client() as any;
        useXrpcAgentStore.getState().setPublicAgent(newAgent);
        expect(useXrpcAgentStore.getState().publicAgent).toBe(newAgent);
    });

    it('setThisClientでThisClientを更新できる', () => {
        const newClient = new Client() as any;
        useXrpcAgentStore.getState().setThisClient(newClient);
        expect(useXrpcAgentStore.getState().thisClient).toBe(newClient);
    });
});
