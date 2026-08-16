import { PrivateBookmarkItem, SpaceCapabilityResult } from './types';

const SPACE_TYPE = 'blue.rito.space.bookmark';
const COLLECTION = 'blue.rito.private.feed.bookmark';
const SPACE_KEY = 'self';

export function getSpaceUri(did: string): string {
  return `at://${did}/space/${SPACE_TYPE}/${SPACE_KEY}`;
}

export function getRecordUri(did: string, rkey: string): string {
  return `at://${did}/space/${SPACE_TYPE}/${SPACE_KEY}/${did}/${COLLECTION}/${rkey}`;
}

/**
 * Check if the user's PDS supports com.atproto.space.* and if the bookmark space exists.
 */
export async function checkSpaceCapability(did: string): Promise<SpaceCapabilityResult> {
  const spaceUri = getSpaceUri(did);
  try {
    const res = await fetch(`/xrpc/com.atproto.space.getSpace?space=${encodeURIComponent(spaceUri)}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    if (res.ok) {
      return { status: 'ready', spaceUri };
    }

    if (res.status === 404) {
      const data = await res.json().catch(() => ({}));
      if (data.error === 'SpaceNotFound' || data.message?.includes('SpaceNotFound')) {
        return { status: 'needs_space', spaceUri, message: 'Space is not created yet' };
      }
      // PDS does not have com.atproto.space.getSpace endpoint
      return { status: 'unsupported', spaceUri, message: 'PDS does not support Permissioned Data (com.atproto.space)' };
    }

    if (res.status === 401 || res.status === 403) {
      return { status: 'needs_auth', spaceUri, message: 'OAuth scope space:blue.rito.space.bookmark authorization required' };
    }

    if (res.status === 501 || res.status === 502 || res.status === 503) {
      return { status: 'unsupported', spaceUri, message: 'Space XRPC methods are not implemented on this PDS' };
    }

    return { status: 'unsupported', spaceUri, message: `PDS returned unexpected status: ${res.status}` };
  } catch (err: any) {
    // Network / offline or local dev without space route
    return { status: 'unsupported', spaceUri, message: err?.message || 'Network error checking PDS space capability' };
  }
}

/**
 * Initialize self-only space on user's PDS
 */
export async function initializeSpace(did: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/xrpc/com.atproto.simplespace.createSpace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        type: SPACE_TYPE,
        skey: SPACE_KEY,
        policy: 'member-list',
        appAccess: '#open',
        members: [did],
      }),
    });

    if (res.ok) {
      return { success: true };
    }

    const data = await res.json().catch(() => ({}));
    if (data.error === 'SpaceAlreadyExists') {
      return { success: true };
    }

    return { success: false, error: data.message || `Failed to create space (${res.status})` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error initializing space' };
  }
}

/**
 * List private bookmark records from user PDS space
 */
export async function listPrivateBookmarks(
  did: string,
  cursor?: string | null,
  limit = 30
): Promise<{ bookmarks: PrivateBookmarkItem[]; cursor: string | null; error?: string }> {
  const spaceUri = getSpaceUri(did);
  const params = new URLSearchParams({
    space: spaceUri,
    collection: COLLECTION,
    repo: did,
    limit: String(limit),
  });
  if (cursor) {
    params.set('cursor', cursor);
  }

  try {
    const res = await fetch(`/xrpc/com.atproto.space.listRecords?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { bookmarks: [], cursor: null, error: errData.message || `Failed to fetch private bookmarks (${res.status})` };
    }

    const data = await res.json();
    const records = data.records || [];
    const nextCursor = data.cursor || null;

    const bookmarks: PrivateBookmarkItem[] = records.map((item: any) => {
      const val = item.value || {};
      const rkey = item.uri ? item.uri.split('/').pop() : item.rkey;
      return {
        uri: item.uri || getRecordUri(did, rkey),
        cid: item.cid,
        rkey,
        subject: val.subject || '',
        comments: val.comments || [],
        tags: val.tags || [],
        ogpTitle: val.ogpTitle,
        ogpDescription: val.ogpDescription,
        ogpImage: val.ogpImage,
        createdAt: val.createdAt || new Date().toISOString(),
      };
    });

    return { bookmarks, cursor: nextCursor };
  } catch (err: any) {
    return { bookmarks: [], cursor: null, error: err?.message || 'Failed to list records' };
  }
}

/**
 * Delete a private bookmark record
 */
export async function deletePrivateBookmarkRecord(
  did: string,
  rkey: string
): Promise<{ success: boolean; error?: string }> {
  const spaceUri = getSpaceUri(did);
  try {
    const res = await fetch('/xrpc/com.atproto.space.deleteRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        space: spaceUri,
        collection: COLLECTION,
        rkey,
        repo: did,
      }),
    });

    if (res.ok) {
      return { success: true };
    }
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.message || `Failed to delete record (${res.status})` };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error deleting record' };
  }
}
