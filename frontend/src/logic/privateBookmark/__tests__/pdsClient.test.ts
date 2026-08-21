import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { deletePrivateBookmarkSpace } from '../pdsClient';

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
      '/xrpc/com.atproto.simplespace.deleteSpace',
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
