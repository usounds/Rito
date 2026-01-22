import { describe, it, expect } from 'vitest';
import {
    epochUsToDateTime,
    isValidTangledUrl,
    normalizeComment,
    extractHandleFromDidDoc,
    checkDomainVerification,
    parseTxtRecordForDid,
    reverseHandleToNsid,
    buildAtUri,
    normalizeTagsArray,
    buildDnsTxtSubdomain,
    extractLinksFromPost,
    extractTagsFromFacets,
    shouldProcessAsRitoPost,
    parseDomainFromUrl,
    DidDocument,
    BookmarkRecord,
    CommentLocale,
} from '../utils.js';

describe('epochUsToDateTime', () => {
    it('should convert epoch microseconds to ISO datetime string', () => {
        // 2024-01-01 00:00:00.000 UTC = 1704067200000 ms = 1704067200000000 us
        const cursorUs = '1704067200000000';
        const result = epochUsToDateTime(cursorUs);
        expect(result).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle string input', () => {
        const cursorUs = '1704067200000000';
        const result = epochUsToDateTime(cursorUs);
        expect(result).toContain('2024-01-01');
    });

    it('should handle number input', () => {
        const cursorUs = 1704067200000000;
        const result = epochUsToDateTime(cursorUs);
        expect(result).toContain('2024-01-01');
    });

    it('should return valid ISO string for current time', () => {
        const nowUs = Date.now() * 1000;
        const result = epochUsToDateTime(nowUs);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});

describe('isValidTangledUrl', () => {
    it('should return true for valid tangled.org URL with matching handle', () => {
        expect(isValidTangledUrl('https://tangled.org/@rito.blue/skeet.el', 'rito.blue')).toBe(true);
    });

    it('should return true for handle without @ prefix', () => {
        expect(isValidTangledUrl('https://tangled.org/rito.blue/skeet.el', 'rito.blue')).toBe(true);
    });

    it('should return false for non-tangled.org domain', () => {
        expect(isValidTangledUrl('https://github.com/@rito.blue/skeet.el', 'rito.blue')).toBe(false);
    });

    it('should return false for URL with path less than 2 parts', () => {
        expect(isValidTangledUrl('https://tangled.org/@rito.blue', 'rito.blue')).toBe(false);
    });

    it('should return false for mismatched handle', () => {
        expect(isValidTangledUrl('https://tangled.org/@other.user/repo', 'rito.blue')).toBe(false);
    });

    it('should return false for invalid URL', () => {
        expect(isValidTangledUrl('not-a-valid-url', 'rito.blue')).toBe(false);
    });

    it('should handle empty URL', () => {
        expect(isValidTangledUrl('', 'rito.blue')).toBe(false);
    });

    it('should return true with deep path', () => {
        expect(isValidTangledUrl('https://tangled.org/@rito.blue/repo/path/to/file', 'rito.blue')).toBe(true);
    });
});

describe('normalizeComment', () => {
    it('should remove hashtags from text', () => {
        const text = 'これは #rito.blue のテストです #test';
        const result = normalizeComment(text);
        expect(result).not.toContain('#rito.blue');
        expect(result).not.toContain('#test');
    });

    it('should remove URLs from text', () => {
        const text = 'Check out https://example.com/path and http://test.org';
        const result = normalizeComment(text);
        expect(result).not.toContain('https://');
        expect(result).not.toContain('http://');
    });

    it('should remove domain-like strings from text', () => {
        const text = 'Visit example.com/page for more info';
        const result = normalizeComment(text);
        expect(result).not.toContain('example.com');
    });

    it('should compress multiple spaces into one', () => {
        const text = 'Hello    World';
        const result = normalizeComment(text);
        expect(result).toBe('Hello World');
    });

    it('should handle full-width spaces', () => {
        const text = 'こんにちは　　　世界';
        const result = normalizeComment(text);
        expect(result).toBe('こんにちは 世界');
    });

    it('should trim leading/trailing spaces per line', () => {
        const text = '  Hello  \n  World  ';
        const result = normalizeComment(text);
        expect(result).toBe('Hello\nWorld');
    });

    it('should preserve newlines', () => {
        const text = 'Line1\nLine2\nLine3';
        const result = normalizeComment(text);
        expect(result).toBe('Line1\nLine2\nLine3');
    });

    it('should handle complex mixed content', () => {
        const text = '記事を共有 #rito.blue https://example.com これはコメントです';
        const result = normalizeComment(text);
        expect(result).toContain('記事を共有');
        expect(result).toContain('これはコメントです');
    });

    it('should return empty string for URLs only', () => {
        const text = 'https://example.com';
        const result = normalizeComment(text);
        expect(result.trim()).toBe('');
    });

    it('should return empty string for tags only', () => {
        const text = '#tag1 #tag2 #tag3';
        const result = normalizeComment(text);
        expect(result.trim()).toBe('');
    });
});

describe('extractHandleFromDidDoc', () => {
    it('should extract handle from alsoKnownAs', () => {
        const didData: DidDocument = { alsoKnownAs: ['at://user.bsky.social'] };
        expect(extractHandleFromDidDoc(didData)).toBe('user.bsky.social');
    });

    it('should return default when alsoKnownAs is empty', () => {
        const didData: DidDocument = { alsoKnownAs: [] };
        expect(extractHandleFromDidDoc(didData)).toBe('no handle');
    });

    it('should return default when alsoKnownAs is undefined', () => {
        const didData: DidDocument = {};
        expect(extractHandleFromDidDoc(didData)).toBe('no handle');
    });

    it('should use custom default value', () => {
        const didData: DidDocument = {};
        expect(extractHandleFromDidDoc(didData, 'custom default')).toBe('custom default');
    });
});

describe('checkDomainVerification', () => {
    it('should verify exact domain match with root path', () => {
        expect(checkDomainVerification('https://user.bsky.social/', 'user.bsky.social')).toBe(true);
    });

    it('should verify exact domain match without path', () => {
        expect(checkDomainVerification('https://user.bsky.social', 'user.bsky.social')).toBe(true);
    });

    it('should verify subdomain match', () => {
        expect(checkDomainVerification('https://blog.user.bsky.social/', 'user.bsky.social')).toBe(true);
    });

    it('should not verify with non-root path', () => {
        expect(checkDomainVerification('https://user.bsky.social/article', 'user.bsky.social')).toBe(false);
    });

    it('should not verify mismatched domain', () => {
        expect(checkDomainVerification('https://other.site.com/', 'user.bsky.social')).toBe(false);
    });

    it('should handle invalid URLs', () => {
        expect(checkDomainVerification('not-a-url', 'user.bsky.social')).toBe(false);
    });
});

describe('parseTxtRecordForDid', () => {
    it('should extract DID from quoted TXT record', () => {
        expect(parseTxtRecordForDid('"did:plc:abc123"')).toBe('did:plc:abc123');
    });

    it('should extract DID from raw text', () => {
        expect(parseTxtRecordForDid('did:plc:xyz789')).toBe('did:plc:xyz789');
    });

    it('should handle did:web format', () => {
        expect(parseTxtRecordForDid('did:web:example.com')).toBe('did:web:example.com');
    });

    it('should return null for no DID', () => {
        expect(parseTxtRecordForDid('some random text')).toBeNull();
    });

    it('should return null for empty string', () => {
        expect(parseTxtRecordForDid('')).toBeNull();
    });
});

describe('reverseHandleToNsid', () => {
    it('should reverse handle correctly', () => {
        expect(reverseHandleToNsid('user.bsky.social')).toBe('social.bsky.user');
    });

    it('should handle simple domain', () => {
        expect(reverseHandleToNsid('example.com')).toBe('com.example');
    });

    it('should handle complex handle', () => {
        expect(reverseHandleToNsid('rito.blue')).toBe('blue.rito');
    });

    it('should handle single part', () => {
        expect(reverseHandleToNsid('localhost')).toBe('localhost');
    });
});

describe('buildAtUri', () => {
    it('should build valid AT URI', () => {
        const result = buildAtUri('did:plc:abc123', 'blue.rito.feed.bookmark', 'rkey123');
        expect(result).toBe('at://did:plc:abc123/blue.rito.feed.bookmark/rkey123');
    });

    it('should handle different collections', () => {
        const result = buildAtUri('did:plc:xyz', 'app.bsky.feed.post', 'post123');
        expect(result).toBe('at://did:plc:xyz/app.bsky.feed.post/post123');
    });
});

describe('normalizeTagsArray', () => {
    it('should filter empty strings', () => {
        const tags = ['test', '', 'valid', '  '];
        expect(normalizeTagsArray(tags)).toEqual(['test', 'valid']);
    });

    it('should filter out "verified" (case insensitive)', () => {
        const tags = ['test', 'Verified', 'VERIFIED', 'valid'];
        expect(normalizeTagsArray(tags)).toEqual(['test', 'valid']);
    });

    it('should add Verified when flag is true', () => {
        const tags = ['test', 'valid'];
        expect(normalizeTagsArray(tags, true)).toEqual(['test', 'valid', 'Verified']);
    });

    it('should handle empty array', () => {
        expect(normalizeTagsArray([])).toEqual([]);
    });
});

describe('buildDnsTxtSubdomain', () => {
    it('should build correct subdomain for NSID', () => {
        expect(buildDnsTxtSubdomain('uk.skyblur.post')).toBe('_lexicon.skyblur.uk');
    });

    it('should handle longer NSID', () => {
        expect(buildDnsTxtSubdomain('blue.rito.feed.bookmark')).toBe('_lexicon.feed.rito.blue');
    });
});

describe('extractLinksFromPost', () => {
    it('should extract link from external embed', () => {
        const record = {
            embed: {
                $type: 'app.bsky.embed.external',
                external: { uri: 'https://example.com/article' }
            }
        };
        expect(extractLinksFromPost(record)).toEqual(['https://example.com/article']);
    });

    it('should return empty array for no embed', () => {
        const record = {};
        expect(extractLinksFromPost(record)).toEqual([]);
    });

    it('should return empty array for non-external embed', () => {
        const record = {
            embed: { $type: 'app.bsky.embed.images' }
        };
        expect(extractLinksFromPost(record)).toEqual([]);
    });

    it('should deduplicate links', () => {
        const record = {
            embed: {
                $type: 'app.bsky.embed.external',
                external: { uri: 'https://example.com' }
            }
        };
        expect(extractLinksFromPost(record)).toEqual(['https://example.com']);
    });
});

describe('extractTagsFromFacets', () => {
    it('should extract tags from facets', () => {
        const facets = [
            {
                features: [
                    { $type: 'app.bsky.richtext.facet#tag', tag: 'rito.blue' },
                    { $type: 'app.bsky.richtext.facet#tag', tag: 'test' }
                ]
            }
        ];
        expect(extractTagsFromFacets(facets)).toEqual(['rito.blue', 'test']);
    });

    it('should handle empty facets', () => {
        expect(extractTagsFromFacets([])).toEqual([]);
    });

    it('should handle undefined facets', () => {
        expect(extractTagsFromFacets(undefined as any)).toEqual([]);
    });

    it('should ignore non-tag features', () => {
        const facets = [
            {
                features: [
                    { $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' },
                    { $type: 'app.bsky.richtext.facet#tag', tag: 'valid' }
                ]
            }
        ];
        expect(extractTagsFromFacets(facets)).toEqual(['valid']);
    });
});

describe('shouldProcessAsRitoPost', () => {
    it('should return true when rito.blue tag is present', () => {
        expect(shouldProcessAsRitoPost(['rito.blue', 'test'])).toBe(true);
    });

    it('should return false when rito.blue tag is missing', () => {
        expect(shouldProcessAsRitoPost(['test', 'other'])).toBe(false);
    });

    it('should return false when via is リト', () => {
        expect(shouldProcessAsRitoPost(['rito.blue'], 'リト')).toBe(false);
    });

    it('should return false when via is Rito', () => {
        expect(shouldProcessAsRitoPost(['rito.blue'], 'Rito')).toBe(false);
    });

    it('should return true for other via values', () => {
        expect(shouldProcessAsRitoPost(['rito.blue'], 'other')).toBe(true);
    });
});

describe('parseDomainFromUrl', () => {
    it('should extract domain from valid URL', () => {
        expect(parseDomainFromUrl('https://example.com/path')).toBe('example.com');
    });

    it('should handle URL with port', () => {
        expect(parseDomainFromUrl('https://example.com:8080/path')).toBe('example.com');
    });

    it('should return null for invalid URL', () => {
        expect(parseDomainFromUrl('not-a-url')).toBeNull();
    });

    it('should return null for empty string', () => {
        expect(parseDomainFromUrl('')).toBeNull();
    });
});

// Type tests
describe('Type Definitions', () => {
    describe('BookmarkRecord', () => {
        it('should accept full BookmarkRecord', () => {
            const bookmark: BookmarkRecord = {
                $type: 'blue.rito.feed.bookmark',
                subject: 'https://example.com/article',
                createdAt: '2024-01-01T00:00:00.000Z',
                comments: [{ lang: 'ja', title: 'Title', comment: 'Comment' }],
                ogpTitle: 'OGP Title',
                ogpDescription: 'OGP Description',
                ogpImage: 'https://example.com/og.jpg',
                tags: ['test', 'bookmark'],
            };
            expect(bookmark.$type).toBe('blue.rito.feed.bookmark');
        });

        it('should accept minimal BookmarkRecord', () => {
            const bookmark: BookmarkRecord = {
                $type: 'blue.rito.feed.bookmark',
                subject: 'https://example.com',
            };
            expect(bookmark.subject).toBe('https://example.com');
        });
    });

    describe('CommentLocale', () => {
        it('should accept full CommentLocale', () => {
            const comment: CommentLocale = {
                lang: 'ja',
                title: 'タイトル',
                comment: 'コメント内容',
            };
            expect(comment.lang).toBe('ja');
        });
    });
});
