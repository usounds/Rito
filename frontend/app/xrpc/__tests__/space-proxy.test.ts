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
import { POST as createSpacePOST } from '@app/xrpc/com.atproto.simplespace.createSpace/route';
import { GET as listMembersGET } from '@app/xrpc/com.atproto.simplespace.listMembers/route';
import { POST as deleteSpacePOST } from '@app/xrpc/com.atproto.simplespace.deleteSpace/route';

describe('xRPC: Space Proxy Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
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
          repo: 'did:plc:valid',
          collection: 'blue.rito.private.feed.bookmark',
          rkey: '123',
          record: { $type: 'blue.rito.private.feed.bookmark', subject: 'https://example.com' },
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
          repo: 'did:plc:valid',
          collection: 'blue.rito.private.feed.bookmark',
          rkey: '123',
          record: { $type: 'blue.rito.private.feed.bookmark', subject: 'https://example.com' },
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
          repo: 'did:plc:valid',
          collection: 'blue.rito.private.feed.bookmark',
          rkey: '123',
          record: { $type: 'blue.rito.private.feed.bookmark', subject: 'https://example.com' },
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

    it('rejects a record write targeting another DID', async () => {
      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.createRecord', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/bookmark/register',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          space: 'at://did:plc:other/space/blue.rito.space.bookmark/self',
          repo: 'did:plc:other',
          collection: 'blue.rito.private.feed.bookmark',
          rkey: '123',
          record: { $type: 'blue.rito.private.feed.bookmark', subject: 'https://example.com' },
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'valid-csrf-token');

      const res = await createRecordPOST(req);

      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('com.atproto.space.listRecords', () => {
    it('rejects a query targeting another DID', async () => {
      const req = new NextRequest(
        'http://localhost/xrpc/com.atproto.space.listRecords?space=at%3A%2F%2Fdid%3Aplc%3Aother%2Fspace%2Fblue.rito.space.bookmark%2Fself&repo=did%3Aplc%3Aother&collection=blue.rito.private.feed.bookmark&limit=30',
        { headers: { referer: 'http://localhost:3000/my/bookmark' } },
      );
      req.cookies.set('USER_DID', 'did:plc:valid.sig');

      const res = await listRecordsGET(req);

      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
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
          repo: 'did:plc:valid',
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

  describe('com.atproto.simplespace.createSpace', () => {
    const policy = { $type: 'com.atproto.simplespace.defs#memberListPolicy' };
    const validBody = { spaceType: 'blue.rito.space.bookmark', skey: 'self', readPolicy: policy, writePolicy: policy, appAccess: { $type: 'com.atproto.simplespace.defs#open' } };
    it.each([
      [validBody, 200],
      [{ ...validBody, type: validBody.spaceType }, 400],
      [{ ...validBody, readPolicy: { $type: 'com.atproto.simplespace.defs#publicPolicy' } }, 400],
      [{ ...validBody, writePolicy: { $type: 'com.atproto.simplespace.defs#publicPolicy' } }, 400],
    ])('validates the split policy request %#', async (body, status) => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ uri: 'space' })));
      const req = new NextRequest('http://localhost/xrpc/com.atproto.simplespace.createSpace', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'csrf' }, body: JSON.stringify(body),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'csrf');
      expect((await createSpacePOST(req)).status).toBe(status);
      if (status === 200) expect(mockFetch).toHaveBeenCalledWith('/xrpc/com.atproto.simplespace.createSpace', expect.objectContaining({ body: JSON.stringify(body) }));
      else expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects additional access-policy fields', async () => {
      const req = new NextRequest('http://localhost/xrpc/com.atproto.simplespace.createSpace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/my/bookmark',
          'X-CSRF-Token': 'valid-csrf-token',
        },
        body: JSON.stringify({
          spaceType: 'blue.rito.space.bookmark',
          skey: 'self',
          writePolicy: {
            $type: 'com.atproto.simplespace.defs#memberListPolicy',
          },
          readPolicy: {
            $type: 'com.atproto.simplespace.defs#memberListPolicy',
            members: ['did:plc:other'],
          },
          appAccess: { $type: 'com.atproto.simplespace.defs#open' },
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'valid-csrf-token');

      const res = await createSpacePOST(req);

      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('member listing and error preservation', () => {
    it.each(['valid', 'other'])('restricts member inspection to the owner space: %s', async (owner) => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ members: [] })));
      const params = new URLSearchParams({ space: `at://did:plc:${owner}/space/blue.rito.space.bookmark/self`, cursor: 'next', limit: '100' });
      const req = new NextRequest(`http://localhost/xrpc/com.atproto.simplespace.listMembers?${params}`);
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      const res = await listMembersGET(req);
      expect(res.status).toBe(owner === 'valid' ? 200 : 400);
      if (owner === 'valid') expect(res.headers.get('Cache-Control')).toContain('no-store');
      else expect(mockFetch).not.toHaveBeenCalled();
    });
    it('preserves an unknown endpoint 404 instead of reporting a missing space', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'XRPCNotSupported' }), { status: 404 }));
      const req = new NextRequest('http://localhost/xrpc/com.atproto.space.getSpace?space=at://did:plc:valid/space/blue.rito.space.bookmark/self');
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      expect(await (await getSpaceGET(req)).json()).toMatchObject({ error: 'XRPCNotSupported' });
    });
  });

  describe('com.atproto.simplespace.deleteSpace', () => {
    it('proxies deletion of the signed-in users private bookmark space', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const req = new NextRequest('http://localhost/xrpc/com.atproto.simplespace.deleteSpace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/settings',
          'X-CSRF-Token': 'delete-space-csrf-token',
        },
        body: JSON.stringify({
          space: 'at://did:plc:valid/space/blue.rito.space.bookmark/self',
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'delete-space-csrf-token');

      const res = await deleteSpacePOST(req);

      expect(res.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/xrpc/com.atproto.simplespace.deleteSpace'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            space: 'at://did:plc:valid/space/blue.rito.space.bookmark/self',
          }),
        })
      );
    });

    it('rejects deletion of another users space', async () => {
      const req = new NextRequest('http://localhost/xrpc/com.atproto.simplespace.deleteSpace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/settings',
          'X-CSRF-Token': 'delete-space-csrf-token',
        },
        body: JSON.stringify({
          space: 'at://did:plc:other/space/blue.rito.space.bookmark/self',
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'delete-space-csrf-token');

      const res = await deleteSpacePOST(req);

      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('rejects unexpected deletion fields', async () => {
      const req = new NextRequest('http://localhost/xrpc/com.atproto.simplespace.deleteSpace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          referer: 'http://localhost:3000/settings',
          'X-CSRF-Token': 'delete-space-csrf-token',
        },
        body: JSON.stringify({
          space: 'at://did:plc:valid/space/blue.rito.space.bookmark/self',
          repo: 'did:plc:valid',
        }),
      });
      req.cookies.set('USER_DID', 'did:plc:valid.sig');
      req.cookies.set('CSRF_TOKEN', 'delete-space-csrf-token');

      const res = await deleteSpacePOST(req);

      expect(res.status).toBe(400);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
