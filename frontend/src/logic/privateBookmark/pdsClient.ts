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
    // 1. Check PDS space endpoint and space existence first
    let res = await fetch(`/xrpc/com.atproto.simplespace.getSpace?space=${encodeURIComponent(spaceUri)}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    if (res.ok) {
      return { status: 'ready', spaceUri };
    }

    const data = await res.json().catch(() => ({}));
    const errCode = data.error || '';
    const errMsg = (data.message || '').toLowerCase();

    // Check if PDS doesn't support Spaces:
    // - 501 / MethodNotImplemented / PdsNotSupported / socket error
    // - ScopeMissingError with AppView proxy aud (indicates PDS has no native Space handler and treated it as unknown RPC forwarded to AppView)
    if (
      res.status === 501 ||
      res.status === 502 ||
      res.status === 503 ||
      errCode === 'MethodNotImplemented' ||
      errCode === 'PdsNotSupported' ||
      errCode === 'ScopeMissingError' ||
      errMsg.includes('not supported') ||
      errMsg.includes('not implemented') ||
      errMsg.includes('scopemissingerror') ||
      errMsg.includes('bsky_appview')
    ) {
      return { status: 'unsupported', spaceUri, message: data.message || 'PDS does not support ATProto Spaces' };
    }

    const isSpaceNotFound =
      res.status === 404 ||
      errCode === 'SpaceNotFound' ||
      errCode === 'SpaceDeleted' ||
      errCode === 'NotFound' ||
      errCode === 'InvalidRequest' ||
      errMsg.includes('not found') ||
      errMsg.includes('spacenotfound') ||
      errMsg.includes('does not exist');

    if (isSpaceNotFound) {
      return { status: 'needs_space', spaceUri, message: 'Space is not created yet' };
    }

    // 2. Check if current session already has space OAuth scope
    const sessionRes = await fetch('/api/session-info', {
      headers: { 'Cache-Control': 'no-store' },
    });
    if (sessionRes.ok) {
      const sessionData = await sessionRes.json().catch(() => ({}));
      if (sessionData.hasSpaceScope === false) {
        return {
          status: 'needs_auth',
          spaceUri,
          message: 'OAuth scope authorization required',
        };
      }
    }

    if (res.status === 401 || res.status === 403 || errCode === 'AuthRequired' || errCode === 'ExpiredToken') {
      return { status: 'needs_auth', spaceUri, message: 'OAuth scope authorization required' };
    }

    return { status: 'unsupported', spaceUri, message: data.message || `PDS returned unexpected status: ${res.status}` };
  } catch (err: any) {
    // Network / offline or local dev without space route
    return { status: 'unsupported', spaceUri, message: err?.message || 'Network error checking PDS space capability' };
  }
}

/**
 * Initiate Step-up OAuth authorization for private bookmark space
 */
export async function requestPrivateAuthorization(returnTo?: string): Promise<void> {
  const targetReturnTo = returnTo || (typeof window !== 'undefined' ? window.location.href : '/my/bookmark');
  const csrf = await fetch('/api/csrf').then((r) => r.json());
  const res = await fetch('/api/oauth/authorize-private', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      returnTo: targetReturnTo,
      csrf: csrf.csrfToken,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = data.error || data.message || `HTTP ${res.status}`;
    throw new Error(err);
  }

  const { url } = await res.json();
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}

async function getCsrfToken(): Promise<string> {
  try {
    const res = await fetch('/api/csrf');
    const data = await res.json();
    return data.csrfToken || '';
  } catch {
    return '';
  }
}

/**
 * Initialize self-only space on user's PDS
 */
export async function initializeSpace(did: string): Promise<{ success: boolean; error?: string }> {
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch('/xrpc/com.atproto.simplespace.createSpace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        type: SPACE_TYPE,
        skey: SPACE_KEY,
        policy: {
          $type: 'com.atproto.simplespace.defs#memberListPolicy',
        },
        appAccess: {
          $type: 'com.atproto.simplespace.defs#open',
        },
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
 * Get a single private bookmark record from user PDS space
 */
export async function getPrivateBookmarkRecord(
  did: string,
  rkey: string
): Promise<{ bookmark: PrivateBookmarkItem | null; error?: string }> {
  const spaceUri = getSpaceUri(did);
  const params = new URLSearchParams({
    space: spaceUri,
    collection: COLLECTION,
    repo: did,
    rkey,
  });

  try {
    const res = await fetch(`/xrpc/com.atproto.space.getRecord?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-store',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { bookmark: null, error: errData.message || `Failed to fetch record (${res.status})` };
    }

    const data = await res.json();
    const val = data.value || {};
    const recordRkey = data.uri ? data.uri.split('/').pop() : rkey;

    return {
      bookmark: {
        uri: data.uri || getRecordUri(did, recordRkey),
        cid: data.cid,
        rkey: recordRkey,
        subject: val.subject || '',
        comments: val.comments || [],
        tags: val.tags || [],
        ogpTitle: val.ogpTitle,
        ogpDescription: val.ogpDescription,
        ogpImage: val.ogpImage,
        createdAt: val.createdAt || new Date().toISOString(),
      },
    };
  } catch (err: any) {
    return { bookmark: null, error: err?.message || 'Network error fetching record' };
  }
}

/**
 * Create a new private bookmark record
 */
export async function createPrivateBookmarkRecord(
  did: string,
  record: {
    subject: string;
    comments: { lang: 'ja' | 'en'; title: string; comment?: string }[];
    tags: string[];
    ogpTitle?: string;
    ogpDescription?: string;
    ogpImage?: string;
    createdAt?: string;
  },
  rkey?: string
): Promise<{ success: boolean; uri?: string; rkey?: string; error?: string }> {
  const spaceUri = getSpaceUri(did);
  const targetRkey = rkey || (await import('@atcute/tid')).now();
  const endpoint = rkey ? '/xrpc/com.atproto.space.putRecord' : '/xrpc/com.atproto.space.createRecord';
  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        space: spaceUri,
        collection: COLLECTION,
        repo: did,
        rkey: targetRkey,
        record: {
          $type: COLLECTION,
          subject: record.subject,
          comments: record.comments,
          tags: record.tags.length > 0 ? record.tags : undefined,
          ogpTitle: record.ogpTitle || undefined,
          ogpDescription: record.ogpDescription || undefined,
          ogpImage: record.ogpImage || undefined,
          createdAt: record.createdAt || new Date().toISOString(),
        },
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: true,
        uri: data.uri || getRecordUri(did, targetRkey),
        rkey: targetRkey,
      };
    }

    const errData = await res.json().catch(() => ({}));
    return {
      success: false,
      error: errData.message || errData.error || `Failed to create private bookmark (${res.status})`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error creating private bookmark',
    };
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
    const csrfToken = await getCsrfToken();
    const res = await fetch('/xrpc/com.atproto.space.deleteRecord', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-CSRF-Token': csrfToken,
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
