import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockAuthorize, mockRestore } = vi.hoisted(() => ({
  mockAuthorize: vi.fn().mockResolvedValue(new URL('https://bsky.social/oauth/authorize?scope=space')),
  mockRestore: vi.fn().mockResolvedValue({
    getTokenInfo: vi.fn().mockResolvedValue({ scope: 'atproto blob:*/*' }),
  }),
}));

vi.mock('@/logic/HandleOauthClientNode', () => ({
  getOAuthClient: vi.fn().mockResolvedValue({
    authorize: mockAuthorize,
    restore: mockRestore,
  }),
  verifySignedDid: vi.fn((signedDid: string) => {
    if (signedDid === 'did:plc:valid.sig') return 'did:plc:valid';
    return null;
  }),
}));

// Mock environment
vi.stubEnv('NEXT_PUBLIC_URL', 'http://localhost:3000');

import { POST } from '@app/api/oauth/authorize-private/route';

describe('API: /api/oauth/authorize-private', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('401 when USER_DID cookie is missing', async () => {
    const req = new NextRequest('http://localhost/api/oauth/authorize-private', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        referer: 'http://localhost:3000/',
      },
      body: JSON.stringify({ csrf: 'valid-token' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('403 when CSRF token is mismatched', async () => {
    const req = new NextRequest('http://localhost/api/oauth/authorize-private', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        referer: 'http://localhost:3000/',
      },
      body: JSON.stringify({ csrf: 'bad-token' }),
    });
    req.cookies.set('USER_DID', 'did:plc:valid.sig');
    req.cookies.set('CSRF_TOKEN', 'good-token');

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns authorize URL with space scope on valid request', async () => {
    const req = new NextRequest('http://localhost/api/oauth/authorize-private', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        referer: 'http://localhost:3000/',
      },
      body: JSON.stringify({
        returnTo: '/my/bookmark',
        csrf: 'valid-token',
      }),
    });
    req.cookies.set('USER_DID', 'did:plc:valid.sig');
    req.cookies.set('CSRF_TOKEN', 'valid-token');

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toContain('https://bsky.social/oauth/authorize');
    expect(mockAuthorize).toHaveBeenCalledWith(
      'did:plc:valid',
      expect.objectContaining({
        prompt: 'consent',
        scope: expect.stringContaining('space:blue.rito.space.bookmark'),
      })
    );
  });
});
