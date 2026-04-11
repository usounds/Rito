import { browser } from 'wxt/browser';
import * as TID from '@atcute/tid';
import RichtextBuilder from '@atcute/bluesky-richtext-builder';
import { detectAll } from 'tinyld';
import type { BlueRitoFeedBookmark } from '@/lexicons';

const RITO_DOMAIN = 'rito.blue';
const RITO_URL = `https://${RITO_DOMAIN}`;
const MAX_TEXT_LENGTH = 300;

export interface BookmarkData {
  url: string;
  title: string;
  tags: string[];
  comment?: string;
  lang: string;
  ogpTitle?: string;
  ogpDescription?: string;
  ogpImage?: string;
  isPostToBluesky?: boolean;
  isUseOriginalLink?: boolean;
}

export async function getSession() {
  const cookie = await browser.cookies.get({
    url: RITO_URL,
    name: 'USER_DID',
  });
  if (!cookie) return null;

  // Verify session on server
  try {
    const res = await fetch(`${RITO_URL}/api/me`, { credentials: 'include' });
    if (!res.ok) return null;
  } catch (e) {
    console.error('Session check failed:', e);
    return null;
  }

  const decoded = decodeURIComponent(cookie.value);
  const index = decoded.lastIndexOf('.');
  if (index === -1) return decoded;
  return decoded.slice(0, index);
}

export async function fetchCsrfToken() {
  const res = await fetch(`${RITO_URL}/api/csrf`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch CSRF token');
  const data = await res.json();
  return data.csrfToken as string;
}

export async function fetchOgp(url: string) {
  const res = await fetch(`${RITO_URL}/api/fetchOgp?url=${encodeURIComponent(url)}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function getLatestTags() {
  const res = await fetch(`${RITO_URL}/xrpc/blue.rito.feed.getLatestBookmarkTag`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data as { tag: string; count: number }[]).map((t) => t.tag);
}

export async function getUserTags(did: string) {
  const res = await fetch(`${RITO_URL}/xrpc/blue.rito.feed.getActorBookmarks?actor=${encodeURIComponent(did)}`);
  if (!res.ok) return [];
  const data = await res.json();
  const tags = (data as any[]).flatMap(b => b.tags || []);
  return [...new Set(tags)].filter(t => t !== 'Verified');
}

/**
 * Check if the domain is blocked.
 */
export async function checkDomain(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`${RITO_URL}/api/checkDomain?domain=${encodeURIComponent(domain)}`, { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.result;
  } catch (e) {
    console.error('Domain check failed:', e);
    return false;
  }
}

/**
 * Check if the bookmark already exists.
 */
export async function checkDuplicate(url: string, did: string): Promise<boolean> {
  try {
    const res = await fetch(`${RITO_URL}/xrpc/blue.rito.feed.getBookmarkBySubject?subject=${encodeURIComponent(url)}&did=${encodeURIComponent(did)}`, { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0;
  } catch (e) {
    console.error('Duplicate check failed:', e);
    return false;
  }
}

/**
 * Upload a blob to the PDS via Rito's proxy.
 */
async function uploadBlob(did: string, imageUrl: string, csrfToken: string) {
  try {
    // 1. Fetch image via Rito's proxy
    const proxyUrl = `${RITO_URL}/api/proxyImage?url=${encodeURIComponent(imageUrl)}`;
    const blobRes = await fetch(proxyUrl);
    if (!blobRes.ok) throw new Error('Failed to fetch image via proxy');
    
    const blobData = await blobRes.blob();
    if (blobData.size === 0) throw new Error('Empty blob');

    // 2. Upload to PDS
    const uploadRes = await fetch(`${RITO_URL}/xrpc/com.atproto.repo.uploadBlob`, {
      method: 'POST',
      headers: {
        'Content-Type': blobData.type,
        'X-CSRF-Token': csrfToken,
      },
      body: blobData,
      credentials: 'include',
    });

    if (!uploadRes.ok) throw new Error('Failed to upload blob');
    const data = await uploadRes.json();
    return data.blob;
  } catch (e) {
    console.error('Blob upload failed:', e);
    return undefined;
  }
}

function detectTopLanguages(text: string): string[] {
  const results = detectAll(text);
  if (!results || results.length === 0) return [];
  const sorted = results.sort((a, b) => b.accuracy - a.accuracy);
  return sorted.slice(0, 2).map(r => r.lang);
}

function buildPost(
  comment: string | undefined,
  tags: string[],
  ritoUrl: string | undefined,
  t: (key: string) => string
) {
  const builder = new RichtextBuilder();
  let validTags = tags.filter(tag => !/\s/.test(tag));
  if (!validTags.includes('rito.blue')) {
    validTags = [...validTags, 'rito.blue'];
  }

  const tagsLength = validTags.reduce((sum, tag) => sum + 1 + tag.length + 1, 0);
  let referText = '';
  let referLength = 0;
  
  if (ritoUrl) {
    referText = `\n\n${t('msgReferInRito')}`;
    referLength = referText.length;
  }

  const baseText = comment || t('msgBookmark');
  builder.addText(baseText.slice(0, MAX_TEXT_LENGTH - tagsLength - referLength));

  if (ritoUrl) {
    builder.addText('\n\n');
    builder.addLink(t('msgReferInRito'), ritoUrl as `${string}:${string}`);
  }

  validTags.forEach(tag => {
    builder.addText(' ');
    builder.addTag(`#${tag}`, tag);
  });

  return {
    $type: 'app.bsky.feed.post',
    text: builder.text,
    facets: builder.facets,
    createdAt: new Date().toISOString(),
    langs: detectTopLanguages(baseText),
    via: t('extensionName'),
  };
}

export async function saveBookmark(data: BookmarkData) {
  const did = await getSession();
  if (!did) throw new Error('Not logged in to Rito');

  const csrfToken = await fetchCsrfToken();
  const t = (key: string) => browser.i18n.getMessage(key as any);

  const bookmarkRecord: BlueRitoFeedBookmark.Main = {
    $type: 'blue.rito.feed.bookmark',
    subject: data.url as `${string}:${string}`,
    createdAt: new Date().toISOString(),
    comments: [
      {
        lang: data.lang as 'ja' | 'en',
        title: data.title,
        comment: data.comment || '',
      },
    ],
    tags: data.tags.length > 0 ? data.tags : undefined,
    ogpTitle: data.ogpTitle,
    ogpDescription: data.ogpDescription,
    ogpImage: data.ogpImage as `${string}:${string}`,
  };

  const rkey = TID.now();
  const writes: any[] = [
    {
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'blue.rito.feed.bookmark',
      rkey: rkey,
      value: bookmarkRecord,
    },
  ];

  if (data.isPostToBluesky) {
    const ritoUrl = `${RITO_URL}/${data.lang}/bookmark/details?uri=${encodeURIComponent(data.url)}`;
    const postRitoUrl = data.isUseOriginalLink ? ritoUrl : undefined;

    const bskyPost: any = buildPost(data.comment, data.tags, postRitoUrl, t);

    // OGP Embed
    let embedUri = ritoUrl;
    let embedTitle = data.ogpTitle ? `${t('extensionName')} - ${data.ogpTitle}` : t('extensionName');
    let embedDesc = data.ogpDescription || '';
    let embedThumbBlob: any = undefined;

    if (data.ogpImage) {
      embedThumbBlob = await uploadBlob(did, data.ogpImage, csrfToken);
    }

    if (data.isUseOriginalLink) {
      embedUri = data.url;
      const host = new URL(data.url).hostname;
      embedTitle = data.ogpTitle || host;
    } else {
      const host = new URL(data.url).hostname;
      embedTitle = data.ogpTitle 
        ? `${t('msgOriginalSource')} : ${host} - ${data.ogpTitle}`
        : `${t('msgOriginalSource')} : ${host}`;
    }

    bskyPost.embed = {
      $type: 'app.bsky.embed.external',
      external: {
        uri: embedUri,
        title: embedTitle,
        description: embedDesc,
        thumb: embedThumbBlob,
      },
    };

    writes.push({
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'app.bsky.feed.post',
      rkey: rkey,
      value: bskyPost,
    });
  }

  const res = await fetch(`${RITO_URL}/xrpc/com.atproto.repo.applyWrites`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify({
      repo: did,
      writes,
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = errorData.error || 'Failed to save bookmark';
    throw new Error(typeof error === 'object' ? JSON.stringify(error) : String(error));
  }

  return await res.json();
}
