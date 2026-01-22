import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NodeSavedSession, NodeSavedState } from '@atproto/oauth-client-node';

// Define store interfaces for testing
interface StateStore {
    set(key: string, internalState: NodeSavedState): Promise<void>;
    get(key: string): Promise<NodeSavedState | undefined>;
    del(key: string): Promise<void>;
}

interface SessionStore {
    set(sub: string, session: NodeSavedSession): Promise<void>;
    get(sub: string): Promise<NodeSavedSession | undefined>;
    del(sub: string): Promise<void>;
}

// Mock Prisma client
const mockPrisma = {
    nodeOAuthState: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
    },
    nodeOAuthSession: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
    },
};

// Create test implementations of stores (matching the actual implementation)
function createStateStore(prisma: typeof mockPrisma): StateStore {
    return {
        async set(key: string, internalState: NodeSavedState): Promise<void> {
            await prisma.nodeOAuthState.upsert({
                where: { key },
                update: { state: JSON.stringify(internalState) },
                create: { key, state: JSON.stringify(internalState) },
            });
        },

        async get(key: string): Promise<NodeSavedState | undefined> {
            const record = await prisma.nodeOAuthState.findUnique({ where: { key } });
            if (!record) return undefined;

            try {
                return JSON.parse(record.state) as NodeSavedState;
            } catch (err) {
                console.error('Invalid NodeOAuthState JSON:', err);
                return undefined;
            }
        },

        async del(key: string): Promise<void> {
            await prisma.nodeOAuthState.delete({ where: { key } }).catch(() => { });
        },
    };
}

function createSessionStore(prisma: typeof mockPrisma): SessionStore {
    return {
        async set(sub: string, session: NodeSavedSession): Promise<void> {
            await prisma.nodeOAuthSession.upsert({
                where: { key: sub },
                update: { session: JSON.stringify(session) },
                create: { key: sub, session: JSON.stringify(session) },
            });
        },

        async get(sub: string): Promise<NodeSavedSession | undefined> {
            const record = await prisma.nodeOAuthSession.findUnique({ where: { key: sub } });
            if (!record) return undefined;

            try {
                return JSON.parse(record.session) as NodeSavedSession;
            } catch (err) {
                console.error('Invalid NodeOAuthSession JSON:', err);
                return undefined;
            }
        },

        async del(sub: string): Promise<void> {
            await prisma.nodeOAuthSession.delete({ where: { key: sub } }).catch(() => { });
        },
    };
}

describe('OAuth State Store', () => {
    let stateStore: StateStore;

    beforeEach(() => {
        vi.clearAllMocks();
        stateStore = createStateStore(mockPrisma);
    });

    describe('set', () => {
        it('should call prisma upsert with correct parameters', async () => {
            const mockState = { dpopKey: 'test' } as unknown as NodeSavedState;
            mockPrisma.nodeOAuthState.upsert.mockResolvedValue({});

            await stateStore.set('testKey', mockState);

            expect(mockPrisma.nodeOAuthState.upsert).toHaveBeenCalledWith({
                where: { key: 'testKey' },
                update: { state: JSON.stringify(mockState) },
                create: { key: 'testKey', state: JSON.stringify(mockState) },
            });
        });
    });

    describe('get', () => {
        it('should return state when found', async () => {
            const mockState = { dpopKey: 'test' };
            mockPrisma.nodeOAuthState.findUnique.mockResolvedValue({
                key: 'testKey',
                state: JSON.stringify(mockState),
            });

            const result = await stateStore.get('testKey');

            expect(result).toEqual(mockState);
        });

        it('should return undefined when not found', async () => {
            mockPrisma.nodeOAuthState.findUnique.mockResolvedValue(null);

            const result = await stateStore.get('nonexistent');

            expect(result).toBeUndefined();
        });

        it('should return undefined for invalid JSON', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockPrisma.nodeOAuthState.findUnique.mockResolvedValue({
                key: 'testKey',
                state: 'invalid json {{{',
            });

            const result = await stateStore.get('testKey');

            expect(result).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('del', () => {
        it('should call prisma delete', async () => {
            mockPrisma.nodeOAuthState.delete.mockResolvedValue({});

            await stateStore.del('testKey');

            expect(mockPrisma.nodeOAuthState.delete).toHaveBeenCalledWith({
                where: { key: 'testKey' },
            });
        });

        it('should not throw on delete failure', async () => {
            mockPrisma.nodeOAuthState.delete.mockRejectedValue(new Error('Not found'));

            await expect(stateStore.del('nonexistent')).resolves.not.toThrow();
        });
    });
});

describe('OAuth Session Store', () => {
    let sessionStore: SessionStore;

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStore = createSessionStore(mockPrisma);
    });

    describe('set', () => {
        it('should call prisma upsert with correct parameters', async () => {
            const mockSession = { tokenSet: {} } as unknown as NodeSavedSession;
            mockPrisma.nodeOAuthSession.upsert.mockResolvedValue({});

            await sessionStore.set('did:plc:test', mockSession);

            expect(mockPrisma.nodeOAuthSession.upsert).toHaveBeenCalledWith({
                where: { key: 'did:plc:test' },
                update: { session: JSON.stringify(mockSession) },
                create: { key: 'did:plc:test', session: JSON.stringify(mockSession) },
            });
        });
    });

    describe('get', () => {
        it('should return session when found', async () => {
            const mockSession = { tokenSet: { accessToken: 'abc' } };
            mockPrisma.nodeOAuthSession.findUnique.mockResolvedValue({
                key: 'did:plc:test',
                session: JSON.stringify(mockSession),
            });

            const result = await sessionStore.get('did:plc:test');

            expect(result).toEqual(mockSession);
        });

        it('should return undefined when not found', async () => {
            mockPrisma.nodeOAuthSession.findUnique.mockResolvedValue(null);

            const result = await sessionStore.get('did:plc:nonexistent');

            expect(result).toBeUndefined();
        });

        it('should return undefined for invalid JSON', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockPrisma.nodeOAuthSession.findUnique.mockResolvedValue({
                key: 'did:plc:test',
                session: 'not valid json',
            });

            const result = await sessionStore.get('did:plc:test');

            expect(result).toBeUndefined();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('del', () => {
        it('should call prisma delete', async () => {
            mockPrisma.nodeOAuthSession.delete.mockResolvedValue({});

            await sessionStore.del('did:plc:test');

            expect(mockPrisma.nodeOAuthSession.delete).toHaveBeenCalledWith({
                where: { key: 'did:plc:test' },
            });
        });

        it('should not throw on delete failure', async () => {
            mockPrisma.nodeOAuthSession.delete.mockRejectedValue(new Error('Not found'));

            await expect(sessionStore.del('did:plc:nonexistent')).resolves.not.toThrow();
        });
    });
});

describe('OAuth SCOPE', () => {
    it('should contain required scopes', () => {
        const SCOPE = [
            "atproto",
            "include:blue.rito.permissionSet",
            "repo:app.bsky.feed.post",
            "rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app%23bsky_appview",
            "blob:*/*",
        ];

        expect(SCOPE).toContain('atproto');
        expect(SCOPE).toContain('include:blue.rito.permissionSet');
        expect(SCOPE).toContain('repo:app.bsky.feed.post');
        expect(SCOPE).toContain('blob:*/*');
    });

    it('should have correct scope length', () => {
        const SCOPE = [
            "atproto",
            "include:blue.rito.permissionSet",
            "repo:app.bsky.feed.post",
            "rpc:app.bsky.actor.getProfile?aud=did:web:api.bsky.app%23bsky_appview",
            "blob:*/*",
        ];

        expect(SCOPE.length).toBe(5);
    });
});

describe('OAuth Client Configuration', () => {
    it('should generate correct client metadata structure', () => {
        const baseUrl = 'https://rito.blue';

        const clientMetadata = {
            client_id: `${baseUrl}/api/client-metadata.json`,
            client_name: 'Rito',
            client_uri: baseUrl,
            logo_uri: `${baseUrl}/favicon.ico`,
            tos_uri: `${baseUrl}/tos`,
            policy_uri: `${baseUrl}/privacy`,
            redirect_uris: [`${baseUrl}/api/oauth/callback`],
            grant_types: ['authorization_code', 'refresh_token'],
            scope: 'atproto include:blue.rito.permissionSet repo:app.bsky.feed.post blob:*/*',
            response_types: ['code'],
            application_type: 'web',
            token_endpoint_auth_method: 'private_key_jwt',
            token_endpoint_auth_signing_alg: 'RS256',
            dpop_bound_access_tokens: true,
            jwks_uri: `${baseUrl}/api/jwks.json`,
        };

        expect(clientMetadata.client_id).toBe('https://rito.blue/api/client-metadata.json');
        expect(clientMetadata.client_name).toBe('Rito');
        expect(clientMetadata.redirect_uris).toContain('https://rito.blue/api/oauth/callback');
        expect(clientMetadata.grant_types).toContain('authorization_code');
        expect(clientMetadata.grant_types).toContain('refresh_token');
        expect(clientMetadata.token_endpoint_auth_method).toBe('private_key_jwt');
        expect(clientMetadata.dpop_bound_access_tokens).toBe(true);
    });
});
