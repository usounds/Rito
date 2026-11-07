import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkSpaceCapability, initializeSpace, deletePrivateBookmarkSpace } from '../pdsClient';

const fetchMock = vi.fn();

describe('deletePrivateBookmarkSpace', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('sends only the current users fixed private bookmark space', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const result = await deletePrivateBookmarkSpace('did:plc:testuser');

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/xrpc/com.atproto.space.deleteSpace',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-CSRF-Token': 'csrf-token' }),
        body: JSON.stringify({
          space: 'at://did:plc:testuser/space/blue.rito.space.bookmark/self',
        }),
      })
    );
  });

  it('treats an already missing space as successfully deleted', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'SpaceNotFound' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    await expect(deletePrivateBookmarkSpace('did:plc:testuser')).resolves.toEqual({ success: true });
  });

  it('returns the PDS error when deletion is rejected', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'NotSpaceOwner', message: 'The caller is not the space owner' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    await expect(deletePrivateBookmarkSpace('did:plc:testuser')).resolves.toEqual({
      success: false,
      error: 'The caller is not the space owner',
    });
  });
});


describe('spaces alpha compatibility', () => {
  const did = 'did:plc:testuser';
  const uri = `at://${did}/space/blue.rito.space.bookmark/self`;
  const policy = { $type: 'com.atproto.memberspace.policy' };
  const configuration = { uri, policy };
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterAll(() => vi.unstubAllGlobals());

  it('creates a personalspace and verifies access before reporting success', async () => {
    fetchMock.mockResolvedValueOnce(respond({ csrfToken: 'csrf' }))
      .mockResolvedValueOnce(respond({ uri }))
      .mockResolvedValueOnce(respond({ uri, policy: { $type: 'com.atproto.personalspace.policy' } }))
      .mockResolvedValueOnce(respond({ records: [] }));
    expect((await initializeSpace(did)).success).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      spaceType: 'blue.rito.space.bookmark', skey: 'self',
      policy: { $type: 'com.atproto.personalspace.policy' },
    });
  });

  it.each([
    [404, 'SpaceNotFound', 'needs_space'],
    [404, 'XRPCNotSupported', 'unsupported'],
    [400, 'InvalidRequest', 'error'],
    [403, 'ScopeMissingError', 'needs_auth'],
    [502, 'UpstreamError', 'error'],
    [503, 'Unavailable', 'error'],
    [400, 'RepoTakendown', 'error'],
    [400, 'RepoDeactivated', 'error'],
    [401, 'AccountDeactivated', 'error'],
  ])('classifies %s %s as %s', async (httpStatus, error, status) => {
    fetchMock.mockResolvedValueOnce(respond({ error }, httpStatus));
    expect((await checkSpaceCapability(did)).status).toBe(status);
  });

  it('keeps a migrated memberspace usable after inspecting all member pages', async () => {
    fetchMock.mockResolvedValueOnce(respond({ uri, policy: {
      ...policy, publicRead: false, publicWrite: false, publishPolicy: false, publishMembers: false,
    } }))
      .mockResolvedValueOnce(respond({ members: [{ did, read: true, write: true }], cursor: 'next' }))
      .mockResolvedValueOnce(respond({ members: [] }))
      .mockResolvedValueOnce(respond({ records: [] }));
    expect((await checkSpaceCapability(did)).status).toBe('ready');
    expect(fetchMock.mock.calls[1][0]).toContain('com.atproto.memberspace.listMembers');
    expect(fetchMock.mock.calls[2][0]).toContain('cursor=next');
  });

  it('uses personalspace without requesting members', async () => {
    fetchMock.mockResolvedValueOnce(respond({ uri, policy: { $type: 'com.atproto.personalspace.policy' } }))
      .mockResolvedValueOnce(respond({ records: [] }));
    expect((await checkSpaceCapability(did)).status).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain('com.atproto.space.getSpace');
    expect(fetchMock.mock.calls[1][0]).toContain('com.atproto.space.listRecords');
  });

  it.each([
    { ...policy, publicWrite: true },
    { ...policy, publishPolicy: true },
    { ...policy, publishMembers: true },
    { ...policy, allowedApps: [] },
    { $type: 'com.atproto.managedspace.policy', managingApp: did },
  ])('rejects an unsafe or unverified policy: %j', async (policy) => {
    fetchMock.mockResolvedValueOnce(respond({ uri, policy }));
    expect((await checkSpaceCapability(did)).status).toBe('error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects public read access', async () => {
    fetchMock.mockResolvedValueOnce(respond({ ...configuration, policy: { ...policy, publicRead: true } }));
    expect((await checkSpaceCapability(did)).status).toBe('error');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('checks later member pages and rejects another member', async () => {
    fetchMock.mockResolvedValueOnce(respond(configuration))
      .mockResolvedValueOnce(respond({ members: [{ did, read: true, write: true }], cursor: 'next' }))
      .mockResolvedValueOnce(respond({ members: [{ did: 'did:plc:other', read: true, write: false }] }));
    expect((await checkSpaceCapability(did)).status).toBe('error');
    expect(fetchMock.mock.calls[2][0]).toContain('cursor=next');
  });

  it('verifies an already existing space instead of trusting the conflict', async () => {
    fetchMock.mockResolvedValueOnce(respond({ csrfToken: 'csrf' }))
      .mockResolvedValueOnce(respond({ error: 'SpaceAlreadyExists' }, 400))
      .mockResolvedValueOnce(respond({ ...configuration, policy: {} }));
    expect((await initializeSpace(did)).success).toBe(false);
  });

  it('reports an offline PDS as an error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect((await checkSpaceCapability(did)).status).toBe('error');
  });
});
