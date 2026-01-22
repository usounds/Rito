/**
 * Utility functions for the backend that are testable in isolation.
 * These are extracted from index.ts for better testability.
 */

// Type definitions for API responses
export interface DidDocument {
    alsoKnownAs?: string[];
}

export interface DomainCheckResult {
    result: boolean;
}

export interface OgpResult {
    result: {
        ogTitle?: string;
        ogDescription?: string;
        ogImage?: { url: string }[];
    };
}

export interface DnsAnswer {
    data: string;
}

export interface DnsResponse {
    Answer?: DnsAnswer[];
}

export interface PostToBookmarkRecord {
    sub: string;
    lang?: string;
}

// Comment locale type
export interface CommentLocale {
    lang: string;
    title?: string;
    comment?: string;
}

// Bookmark record type (the inner object, not the full record schema)
export interface BookmarkRecord {
    $type: 'blue.rito.feed.bookmark';
    subject: string;
    createdAt?: string;
    comments?: CommentLocale[];
    ogpTitle?: string;
    ogpDescription?: string;
    ogpImage?: string;
    tags?: string[];
}

/**
 * Convert epoch microseconds to ISO datetime string
 */
export function epochUsToDateTime(cursor: string | number): string {
    return new Date(Number(cursor) / 1000).toISOString();
}

/**
 * Validate if URL is a valid tangled.org URL for the given user handle
 */
export function isValidTangledUrl(url: string, userProfHandle: string): boolean {
    try {
        const u = new URL(url);

        // ドメインが tangled.org であることを確認
        if (u.hostname !== "tangled.org") return false;

        // パスを分解
        const parts = u.pathname.split("/").filter(Boolean);

        // 最低でも2要素必要（例: ["@rito.blue", "skeet.el"]）
        if (parts.length < 2) return false;

        // 1個目が @handle であることを確認
        if (parts[0] !== userProfHandle && parts[0] !== `@${userProfHandle}`) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Normalize comment text by removing hashtags, URLs, and compressing whitespace
 */
export function normalizeComment(text: string): string {
    let result = text;

    // #tags を削除
    result = result.replace(/#[^\s#]+/g, '');

    // URL / ドメイン（パス付き含む）を根こそぎ削除
    result = result.replace(
        /\bhttps?:\/\/[^\s]+|\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
        ''
    );

    // 空白を 1 つに圧縮
    result = result
        // 半角スペース + 全角スペースを 1 つに
        .replace(/[ 　]+/g, ' ')
        // 行頭・行末のスペースだけ除去（改行は残る）
        .replace(/^[ 　]+|[ 　]+$/gm, '');

    return result;
}

/**
 * Extract handle from DID document's alsoKnownAs field
 */
export function extractHandleFromDidDoc(didData: DidDocument, defaultHandle: string = 'no handle'): string {
    return didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? defaultHandle;
}

/**
 * Check if URL domain matches user handle for verification
 */
export function checkDomainVerification(subject: string, handle: string): boolean {
    try {
        const url = new URL(subject);
        const domain = url.hostname;

        if ((url.pathname === '/' || url.pathname === '') &&
            (domain === handle || domain.endsWith(`.${handle}`))) {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Parse DID from DNS TXT record data
 */
export function parseTxtRecordForDid(txtData: string): string | null {
    // Remove quotes and join
    const cleaned = txtData.replace(/^"|"$/g, "").replace(/"/g, "");
    const didMatch = cleaned.match(/did:[\w:.]+/);
    return didMatch ? didMatch[0] : null;
}

/**
 * Reverse a handle to NSID prefix format
 * Example: "rito.blue" -> "blue.rito"
 */
export function reverseHandleToNsid(handle: string): string {
    return handle.split('.').reverse().join('.');
}

/**
 * Build AT URI from components
 */
export function buildAtUri(did: string, collection: string, rkey: string): string {
    return `at://${did}/${collection}/${rkey}`;
}

/**
 * Filter and normalize tags array
 */
export function normalizeTagsArray(tags: string[], shouldAddVerified: boolean = false): string[] {
    let result = (tags ?? [])
        .filter((name: string) => name && name.trim().length > 0)
        .filter((name: string) => name.toLowerCase() !== "verified");

    if (shouldAddVerified) {
        result.push("Verified");
    }

    return result;
}

/**
 * Build subdomain for DNS TXT lookup
 * Example: "uk.skyblur.post" -> "_lexicon.skyblur.uk"
 */
export function buildDnsTxtSubdomain(nsid: string): string {
    const parts = nsid.split('.').reverse();
    return `_lexicon.${parts.slice(1).join('.')}`;
}

/**
 * Extract unique links from post facets and embed
 */
export function extractLinksFromPost(record: any): string[] {
    const links: string[] = [];

    if (record.embed?.$type === 'app.bsky.embed.external' && record.embed.external?.uri) {
        links.push(record.embed.external.uri);
    }

    return Array.from(new Set(links.filter((l): l is string => !!l)));
}

/**
 * Extract hashtags from post facets
 */
export function extractTagsFromFacets(facets: any[]): string[] {
    const tags: string[] = [];

    if (facets) {
        for (const facet of facets) {
            if (facet.features) {
                for (const feature of facet.features) {
                    if (feature.$type === 'app.bsky.richtext.facet#tag' && feature.tag) {
                        tags.push(feature.tag);
                    }
                }
            }
        }
    }

    return tags;
}

/**
 * Check if post should be processed as rito.blue bookmark
 */
export function shouldProcessAsRitoPost(tags: string[], via?: string): boolean {
    if (!tags.includes('rito.blue')) {
        return false;
    }

    if (via === 'リト' || via === 'Rito') {
        return false;
    }

    return true;
}

/**
 * Parse domain from URL string
 */
export function parseDomainFromUrl(urlString: string): string | null {
    try {
        const url = new URL(urlString);
        return url.hostname;
    } catch {
        return null;
    }
}
