import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { verifySignedDid, getOAuthClient } from '@/logic/HandleOauthClientNode';
import { Agent } from '@atproto/api';

const { mockApplyWrites } = vi.hoisted(() => ({
    mockApplyWrites: vi.fn(),
}));

vi.mock('@/logic/HandleOauthClientNode', () => ({
    verifySignedDid: vi.fn(),
    getOAuthClient: vi.fn(),
}));

vi.mock('@atproto/api', () => ({
    Agent: class {
        com = {
            atproto: {
                repo: {
                    applyWrites: mockApplyWrites,
                },
            },
        };
    },
}));

describe('xrpc/com.atproto.repo.applyWrites', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_URL = 'http://localhost:3000';
    });

    const createRequest = (body: any, headers: Record<string, string> = {}, cookies: Record<string, string> = {}) => {
        const req = new NextRequest('http://localhost:3000/xrpc/com.atproto.repo.applyWrites', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'content-type': 'application/json',
                ...headers,
            },
        });

        // @ts-ignore - Mock cookies
        req.cookies.get = vi.fn((name) => {
            const val = cookies[name];
            return val ? { value: val } : undefined;
        });

        return req;
    };

    it('CSRFトークンが一致しない場合は403を返す', async () => {
        const req = createRequest({}, { 'x-csrf-token': 'wrong' }, { 'CSRF_TOKEN': 'correct' });
        const res = await POST(req);
        expect(res.status).toBe(403);
        const text = await res.text();
        expect(text).toBe('Invalid CSRF token');
    });

    it('ログインしていない（USER_DIDがない）場合は401を返す', async () => {
        const req = createRequest({}, { 'x-csrf-token': 'token' }, { 'CSRF_TOKEN': 'token' });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('署名が無効な場合は401を返す', async () => {
        vi.mocked(verifySignedDid).mockReturnValue(null);
        const req = createRequest({}, { 'x-csrf-token': 'token' }, { 'CSRF_TOKEN': 'token', 'USER_DID': 'invalid' });
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('正常に書き込みが成功した場合の処理', async () => {
        const did = 'did:plc:test';
        vi.mocked(verifySignedDid).mockReturnValue(did);
        const mockSession = { did };
        const mockClient = {
            restore: vi.fn().mockResolvedValue(mockSession),
        };
        vi.mocked(getOAuthClient).mockResolvedValue(mockClient as any);
        mockApplyWrites.mockResolvedValue({ success: true, data: { foo: 'bar' } });

        const body = { writes: [{ action: 'create' }] };
        const req = createRequest(body, { 'x-csrf-token': 'token' }, { 'CSRF_TOKEN': 'token', 'USER_DID': 'valid' });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toEqual({ foo: 'bar' });
        expect(mockApplyWrites).toHaveBeenCalledWith(body);
    });

    it('APIエラー時に500を返す', async () => {
        vi.mocked(verifySignedDid).mockReturnValue('did:plc:test');
        const mockClient = {
            restore: vi.fn().mockResolvedValue({}),
        };
        vi.mocked(getOAuthClient).mockResolvedValue(mockClient as any);
        mockApplyWrites.mockRejectedValue(new Error('API Error'));

        const req = createRequest({}, { 'x-csrf-token': 'token' }, { 'CSRF_TOKEN': 'token', 'USER_DID': 'valid' });

        const res = await POST(req);
        expect(res.status).toBe(500);
    });
});
