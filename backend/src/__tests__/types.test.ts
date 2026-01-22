import { describe, it, expect } from 'vitest';

// Type definitions for testing - mirroring those in index.ts

interface DidDocument {
    alsoKnownAs?: string[];
}

interface DomainCheckResult {
    result: boolean;
}

interface OgpResult {
    result: {
        ogTitle?: string;
        ogDescription?: string;
        ogImage?: { url: string }[];
    };
}

interface DnsAnswer {
    data: string;
}

interface DnsResponse {
    Answer?: DnsAnswer[];
}

interface PostToBookmarkRecord {
    sub: string;
    lang?: string;
}

interface CommentLocale {
    lang: string;
    title?: string;
    comment?: string;
}

interface BookmarkRecord {
    $type: 'blue.rito.feed.bookmark';
    subject: string;
    createdAt?: string;
    comments?: CommentLocale[];
    ogpTitle?: string;
    ogpDescription?: string;
    ogpImage?: string;
    tags?: string[];
}

describe('Type Definitions', () => {
    describe('DidDocument', () => {
        it('should accept valid DidDocument', () => {
            const doc: DidDocument = {
                alsoKnownAs: ['at://user.bsky.social'],
            };
            expect(doc.alsoKnownAs).toHaveLength(1);
        });

        it('should accept empty DidDocument', () => {
            const doc: DidDocument = {};
            expect(doc.alsoKnownAs).toBeUndefined();
        });
    });

    describe('DomainCheckResult', () => {
        it('should accept valid DomainCheckResult', () => {
            const result: DomainCheckResult = { result: true };
            expect(result.result).toBe(true);
        });
    });

    describe('OgpResult', () => {
        it('should accept valid OgpResult with all fields', () => {
            const ogp: OgpResult = {
                result: {
                    ogTitle: 'Test Title',
                    ogDescription: 'Test Description',
                    ogImage: [{ url: 'https://example.com/image.jpg' }],
                },
            };
            expect(ogp.result.ogTitle).toBe('Test Title');
            expect(ogp.result.ogImage?.[0].url).toBe('https://example.com/image.jpg');
        });

        it('should accept OgpResult with partial fields', () => {
            const ogp: OgpResult = {
                result: {
                    ogTitle: 'Only Title',
                },
            };
            expect(ogp.result.ogTitle).toBe('Only Title');
            expect(ogp.result.ogDescription).toBeUndefined();
        });
    });

    describe('DnsResponse', () => {
        it('should accept valid DnsResponse', () => {
            const dns: DnsResponse = {
                Answer: [{ data: 'did:plc:abc123' }],
            };
            expect(dns.Answer).toHaveLength(1);
        });

        it('should handle empty Answer', () => {
            const dns: DnsResponse = {};
            expect(dns.Answer).toBeUndefined();
        });
    });

    describe('PostToBookmarkRecord', () => {
        it('should accept valid record with lang', () => {
            const record: PostToBookmarkRecord = {
                sub: 'did:plc:test',
                lang: 'ja',
            };
            expect(record.sub).toBe('did:plc:test');
            expect(record.lang).toBe('ja');
        });

        it('should accept record without lang', () => {
            const record: PostToBookmarkRecord = {
                sub: 'did:plc:test',
            };
            expect(record.lang).toBeUndefined();
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
            expect(comment.title).toBe('タイトル');
        });

        it('should accept CommentLocale with only lang', () => {
            const comment: CommentLocale = { lang: 'en' };
            expect(comment.title).toBeUndefined();
        });
    });

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
            expect(bookmark.subject).toBe('https://example.com/article');
            expect(bookmark.tags).toHaveLength(2);
        });

        it('should accept minimal BookmarkRecord', () => {
            const bookmark: BookmarkRecord = {
                $type: 'blue.rito.feed.bookmark',
                subject: 'https://example.com',
            };
            expect(bookmark.subject).toBe('https://example.com');
            expect(bookmark.comments).toBeUndefined();
        });

        it('should validate comments array', () => {
            const bookmark: BookmarkRecord = {
                $type: 'blue.rito.feed.bookmark',
                subject: 'https://example.com',
                comments: [
                    { lang: 'ja', title: '日本語タイトル' },
                    { lang: 'en', title: 'English Title' },
                ],
            };
            expect(bookmark.comments).toHaveLength(2);
            expect(bookmark.comments?.[0].lang).toBe('ja');
            expect(bookmark.comments?.[1].lang).toBe('en');
        });
    });
});

describe('Handle Extraction', () => {
    // Test handle extraction logic used throughout the codebase

    it('should extract handle from alsoKnownAs', () => {
        const didData: DidDocument = {
            alsoKnownAs: ['at://user.bsky.social'],
        };
        const handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? 'no handle';
        expect(handle).toBe('user.bsky.social');
    });

    it('should return default when alsoKnownAs is empty', () => {
        const didData: DidDocument = {
            alsoKnownAs: [],
        };
        const handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? 'no handle';
        expect(handle).toBe('no handle');
    });

    it('should return default when alsoKnownAs is undefined', () => {
        const didData: DidDocument = {};
        const handle = didData.alsoKnownAs?.[0]?.replace(/^at:\/\//, '') ?? 'no handle';
        expect(handle).toBe('no handle');
    });
});

describe('URL Domain Verification Logic', () => {
    // Test the domain verification logic used in upsertBookmark

    function checkVerification(subject: string, handle: string): boolean {
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

    it('should verify exact domain match with root path', () => {
        expect(checkVerification('https://user.bsky.social/', 'user.bsky.social')).toBe(true);
    });

    it('should verify exact domain match without path', () => {
        expect(checkVerification('https://user.bsky.social', 'user.bsky.social')).toBe(true);
    });

    it('should verify subdomain match', () => {
        expect(checkVerification('https://blog.user.bsky.social/', 'user.bsky.social')).toBe(true);
    });

    it('should not verify with non-root path', () => {
        expect(checkVerification('https://user.bsky.social/article', 'user.bsky.social')).toBe(false);
    });

    it('should not verify mismatched domain', () => {
        expect(checkVerification('https://other.site.com/', 'user.bsky.social')).toBe(false);
    });

    it('should handle invalid URLs', () => {
        expect(checkVerification('not-a-url', 'user.bsky.social')).toBe(false);
    });
});

describe('DNS TXT Record Parsing', () => {
    // Test the DNS TXT record parsing logic

    function parseTxtRecord(txtData: string): string | null {
        const didMatch = txtData.match(/did:[\w:.]+/);
        return didMatch ? didMatch[0] : null;
    }

    it('should extract DID from TXT record', () => {
        const txtData = '"did:plc:abc123"';
        expect(parseTxtRecord(txtData)).toBe('did:plc:abc123');
    });

    it('should extract DID from raw text', () => {
        const txtData = 'did:plc:xyz789';
        expect(parseTxtRecord(txtData)).toBe('did:plc:xyz789');
    });

    it('should handle did:web format', () => {
        const txtData = 'did:web:example.com';
        expect(parseTxtRecord(txtData)).toBe('did:web:example.com');
    });

    it('should return null for no DID', () => {
        const txtData = 'some random text';
        expect(parseTxtRecord(txtData)).toBeNull();
    });

    it('should return null for empty string', () => {
        expect(parseTxtRecord('')).toBeNull();
    });
});

describe('NSID Reversal Logic', () => {
    // Test the namespace ID reversal logic used in resolver verification

    function reverseHandle(handle: string): string {
        return handle.split('.').reverse().join('.');
    }

    it('should reverse handle correctly', () => {
        expect(reverseHandle('user.bsky.social')).toBe('social.bsky.user');
    });

    it('should handle simple domain', () => {
        expect(reverseHandle('example.com')).toBe('com.example');
    });

    it('should handle complex handle', () => {
        expect(reverseHandle('rito.blue')).toBe('blue.rito');
    });

    it('should handle single part', () => {
        expect(reverseHandle('localhost')).toBe('localhost');
    });

    it('should verify nsid starts with reversed handle', () => {
        const handle = 'rito.blue';
        const nsid = 'blue.rito.feed.bookmark';
        const reversedHandle = reverseHandle(handle);
        expect(nsid.startsWith(reversedHandle)).toBe(true);
    });
});
