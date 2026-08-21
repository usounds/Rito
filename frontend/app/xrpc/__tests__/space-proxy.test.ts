import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockFetch, mockRestore } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockRestore: vi.fn(),
}));

vi.mock('@/logic/HandleOauthClientNode', () => ({
  getOAuthClient: vi.fn().mockResolvedValue({
    restore: mockRestore,
  }),
  verifySignedDid: vi.fn((signedDid: string) => {
    if (signedDid === 'did:plc:valid.sig') return 'did:plc:valid';
    return null;
  }),
}));

vi.stubEnv('NEXT_PUBLIC_URL', 'http://localhost:3000');

import { GET as getSpaceGET } from '@app/xrpc/com.atproto.space.getSpace/route';
import { POST as createRecordPOST } from '@app/xrpc/com.atproto.space.createRecord/route';
import { GET as listRecordsGET } from '@app/xrpc/com.atproto.space.listRecords/route';
import { POST as deleteRecordPOST } from '@app/xrpc/com.atproto.space.deleteRecord/route';

describe('xRPC: Space Proxy Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRestore.mockResolvedValue({
      serverMetadata: { issuer: 'https://pds.example.com' },
      fetchHandler: mockFetch,
      fetch: mockFetch,
    });
  });

  describe('com.atproto.space.getSpace', () => {
    it('returns 401 when session cookie is missing', async () => {
      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.getSpace?space=at://did:plc:valid/space/blue.rito.space.bookmark/self', {
        headers: { referer: 'http://localhost:3000/my/bookmark' },
      });
      const res = await getSpaceGET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 with Cache-Control no-store on successful PDS call', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ uri: 'at://did:plc:valid/space/blue.rito.space.bookmark/self' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.getSpace?space=at://did:plc:valid/space/blue.rito.space.bookmark/self', {
        headers: { referer: 'http://localhost:3000/my/bookmark' },
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');

      const res = await getSpaceGET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toContain('no-store');
      expect(data.uri).toBe('at://did:plc:valid/space/blue.rito.space.bookmark/self');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/xrpc/com.atproto.space.getSpace?space='),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('returns 404 when space is not found', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'SpaceNotFound', message: 'Space does not exist' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.getSpace?space=at://did:plc:valid/space/blue.rito.space.bookmark/self', {
        headers: { referer: 'http://localhost:3000/my/bookmark' },
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');

      const res = await getSpaceGET(req);
      expect(res.status).toBe(404);
    });
  });

  describe('com.atproto.space.createRecord', () => {
    it('returns 403 when CSRF token is missing on procedure', async () => {
      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.createRecord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/bookmark/register',
        },
        body: JSON.stringify({
          space: 'at://did:plc:valid/space/blue.rito.space.bookmark/self',
          collection: 'blue.rito.private.feed.bookmark',
          record: { subject: 'https://example.com' },
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');

      const res = await createRecordPOST(req);
      expect(res.status).toBe(403);
    });

    it('returns 403 when CSRF token does not match cookie', async () => {
      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.createRecord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/bookmark/register',
          'X-CSRF-Token': 'tokenA',
        },
        body: JSON.stringify({
          space: 'at://did:plc:valid/space/blue.rito.space.bookmark/self',
          collection: 'blue.rito.private.feed.bookmark',
          record: { subject: 'https://example.com' },
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'tokenB');

      const res = await createRecordPOST(req);
      expect(res.status).toBe(403);
    });

    it('proxies createRecord procedure to PDS with valid CSRF token and body', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            uri: 'at://did:plc:valid/space/blue.rito.space.bookmark/self/did:plc:valid/blue.rito.private.feed.bookmark/123',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.createRecord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/bookmark/register',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          space: 'at://did:plc:valid/space/blue.rito.space.bookmark/self',
          collection: 'blue.rito.private.feed.bookmark',
          record: { subject: 'https://example.com' },
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'valid-csrf-token');

      const res = await createRecordPOST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.uri).toContain('blue.rito.private.feed.bookmark');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/xrpc/com.atproto.space.createRecord'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('com.atproto.space.deleteRecord', () => {
    it('proxies deleteRecord procedure to PDS with valid CSRF', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.deleteRecord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/my/bookmark',
          'X-CSRF-Token': 'delete-csrf-token',
        },
        body: JSON.stringify({
          space: 'at://did:plc:valid/space/blue.rito.space.bookmark/self',
          collection: 'blue.rito.private.feed.bookmark',
          rkey: '123',
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'delete-csrf-token');

      const res = await deleteRecordPOST(req);
      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/xrpc/com.atproto.space.deleteRecord'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
