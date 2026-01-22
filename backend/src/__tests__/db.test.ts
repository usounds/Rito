import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma and database functions
const mockPrisma = {
    jetstreamIndex: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
    },
    userDidHandle: {
        upsert: vi.fn(),
    },
    bookmark: {
        upsert: vi.fn(),
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
    },
    comment: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    },
    tag: {
        upsert: vi.fn(),
    },
    bookmarkTag: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
    },
    postToBookmark: {
        findUnique: vi.fn(),
    },
    resolver: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    },
    like: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
    },
};

// Create testable versions of the database functions
function createDbService(prisma: typeof mockPrisma) {
    const dbLimit = async <T>(fn: () => Promise<T>): Promise<T> => fn();

    return {
        async loadCursor(epochUsToDateTime: (cursor: string | number) => string): Promise<string> {
            try {
                const indexRecord = await prisma.jetstreamIndex.findUnique({
                    where: { service: 'rito' }
                });
                if (indexRecord && indexRecord.index) {
                    return indexRecord.index;
                } else {
                    return Date.now().toString();
                }
            } catch {
                return Date.now().toString();
            }
        },

        async upsertCursor(currentCursor: string): Promise<void> {
            await prisma.jetstreamIndex.upsert({
                where: { service: 'rito' },
                update: { index: currentCursor },
                create: { service: 'rito', index: currentCursor },
            });
        },

        async upsertUserDidHandle(did: string, handle: string): Promise<void> {
            await dbLimit(() =>
                prisma.userDidHandle.upsert({
                    where: { did },
                    update: { handle },
                    create: { did, handle },
                })
            );
        },

        async upsertBookmarkRecord(data: {
            uri: string;
            did: string;
            subject: string;
            ogpTitle?: string;
            ogpDescription?: string;
            ogpImage?: string;
            moderationResult: string | null;
            handle: string;
            createdAt?: Date;
        }): Promise<void> {
            await dbLimit(() =>
                prisma.bookmark.upsert({
                    where: { uri: data.uri },
                    update: {
                        subject: data.subject,
                        ogp_title: data.ogpTitle,
                        ogp_description: data.ogpDescription,
                        ogp_image: data.ogpImage,
                        moderation_result: data.moderationResult,
                        handle: data.handle,
                        indexed_at: new Date(),
                    },
                    create: {
                        uri: data.uri,
                        did: data.did,
                        subject: data.subject,
                        ogp_title: data.ogpTitle,
                        ogp_description: data.ogpDescription,
                        ogp_image: data.ogpImage,
                        moderation_result: data.moderationResult,
                        handle: data.handle,
                        created_at: data.createdAt ?? new Date(),
                        indexed_at: new Date(),
                    },
                })
            );
        },

        async upsertComment(data: {
            bookmarkUri: string;
            lang: string;
            title?: string;
            comment?: string;
            moderationResult: string | null;
        }): Promise<void> {
            await dbLimit(() =>
                prisma.comment.upsert({
                    where: {
                        bookmark_uri_lang: {
                            bookmark_uri: data.bookmarkUri,
                            lang: data.lang,
                        },
                    },
                    update: {
                        title: data.title,
                        comment: data.comment,
                        moderation_result: data.moderationResult,
                    },
                    create: {
                        bookmark_uri: data.bookmarkUri,
                        lang: data.lang,
                        title: data.title,
                        comment: data.comment,
                        moderation_result: data.moderationResult,
                    },
                })
            );
        },

        async deleteCommentsNotInLangs(bookmarkUri: string, langs: string[]): Promise<void> {
            await prisma.comment.deleteMany({
                where: {
                    bookmark_uri: bookmarkUri,
                    NOT: {
                        lang: { in: langs },
                    },
                },
            });
        },

        async safeUpsertTag(name: string): Promise<{ id: number; name: string } | null> {
            try {
                return await dbLimit(() =>
                    prisma.tag.upsert({
                        where: { name },
                        update: {},
                        create: { name },
                    })
                ) as { id: number; name: string };
            } catch {
                return null;
            }
        },

        async getBookmarkTagIds(bookmarkUri: string): Promise<number[]> {
            const tags = await prisma.bookmarkTag.findMany({
                where: { bookmark_uri: bookmarkUri },
                select: { tag_id: true },
            });
            return tags.map((r: { tag_id: number }) => r.tag_id);
        },

        async deleteBookmarkTags(bookmarkUri: string, tagIds: number[]): Promise<void> {
            await dbLimit(() =>
                prisma.bookmarkTag.deleteMany({
                    where: { bookmark_uri: bookmarkUri, tag_id: { in: tagIds } },
                })
            );
        },

        async createBookmarkTag(bookmarkUri: string, tagId: number): Promise<void> {
            await dbLimit(() =>
                prisma.bookmarkTag.create({ data: { bookmark_uri: bookmarkUri, tag_id: tagId } })
            );
        },

        async findPostToBookmark(sub: string): Promise<{ sub: string; lang?: string } | null> {
            return await prisma.postToBookmark.findUnique({
                where: { sub },
                select: { sub: true, lang: true },
            });
        },

        async findExistingBookmark(did: string, subject: string): Promise<{ uri: string } | null> {
            return await prisma.bookmark.findFirst({
                where: { did, subject },
                select: { uri: true },
            });
        },

        async upsertResolverRecord(nsid: string, did: string, schema: string, verified: boolean): Promise<void> {
            await dbLimit(() =>
                prisma.resolver.upsert({
                    where: { nsid_did: { nsid, did } },
                    update: { schema, verified, indexed_at: new Date() },
                    create: { nsid, did, schema, verified, indexed_at: new Date() },
                })
            );
        },

        async upsertLikeRecord(aturi: string, subject: string, did: string, createdAt: Date): Promise<void> {
            await dbLimit(() =>
                prisma.like.upsert({
                    where: { aturi },
                    update: { created_at: createdAt },
                    create: { aturi, subject, did, created_at: createdAt },
                })
            );
        },

        async deleteBookmark(uri: string): Promise<{ count: number }> {
            return await dbLimit(() =>
                prisma.bookmark.deleteMany({ where: { uri } })
            );
        },

        async deleteLike(aturi: string): Promise<{ count: number }> {
            return await dbLimit(() =>
                prisma.like.deleteMany({ where: { aturi } })
            );
        },

        async deleteResolver(nsid: string, did: string): Promise<{ count: number }> {
            return await dbLimit(() =>
                prisma.resolver.deleteMany({ where: { nsid, did } })
            );
        },
    };
}

describe('Database Service', () => {
    let dbService: ReturnType<typeof createDbService>;

    beforeEach(() => {
        vi.clearAllMocks();
        dbService = createDbService(mockPrisma);
    });

    describe('loadCursor', () => {
        it('should return cursor from database when found', async () => {
            const epochUsToDateTime = (c: string | number) => new Date(Number(c) / 1000).toISOString();
            mockPrisma.jetstreamIndex.findUnique.mockResolvedValue({ index: '1704067200000000' });

            const result = await dbService.loadCursor(epochUsToDateTime);

            expect(result).toBe('1704067200000000');
            expect(mockPrisma.jetstreamIndex.findUnique).toHaveBeenCalledWith({
                where: { service: 'rito' }
            });
        });

        it('should return current time when no cursor found', async () => {
            const epochUsToDateTime = (c: string | number) => new Date(Number(c) / 1000).toISOString();
            mockPrisma.jetstreamIndex.findUnique.mockResolvedValue(null);
            const before = Date.now();

            const result = await dbService.loadCursor(epochUsToDateTime);

            expect(Number(result)).toBeGreaterThanOrEqual(before);
        });

        it('should return current time on error', async () => {
            const epochUsToDateTime = (c: string | number) => new Date(Number(c) / 1000).toISOString();
            mockPrisma.jetstreamIndex.findUnique.mockRejectedValue(new Error('DB error'));
            const before = Date.now();

            const result = await dbService.loadCursor(epochUsToDateTime);

            expect(Number(result)).toBeGreaterThanOrEqual(before);
        });
    });

    describe('upsertCursor', () => {
        it('should call upsert with correct parameters', async () => {
            mockPrisma.jetstreamIndex.upsert.mockResolvedValue({});

            await dbService.upsertCursor('1704067200000000');

            expect(mockPrisma.jetstreamIndex.upsert).toHaveBeenCalledWith({
                where: { service: 'rito' },
                update: { index: '1704067200000000' },
                create: { service: 'rito', index: '1704067200000000' },
            });
        });
    });

    describe('upsertUserDidHandle', () => {
        it('should upsert user DID handle mapping', async () => {
            mockPrisma.userDidHandle.upsert.mockResolvedValue({});

            await dbService.upsertUserDidHandle('did:plc:abc', 'user.bsky.social');

            expect(mockPrisma.userDidHandle.upsert).toHaveBeenCalledWith({
                where: { did: 'did:plc:abc' },
                update: { handle: 'user.bsky.social' },
                create: { did: 'did:plc:abc', handle: 'user.bsky.social' },
            });
        });
    });

    describe('upsertBookmarkRecord', () => {
        it('should upsert bookmark with all fields', async () => {
            mockPrisma.bookmark.upsert.mockResolvedValue({});

            await dbService.upsertBookmarkRecord({
                uri: 'at://did:plc:abc/blue.rito.feed.bookmark/123',
                did: 'did:plc:abc',
                subject: 'https://example.com',
                ogpTitle: 'Test Title',
                ogpDescription: 'Test Description',
                ogpImage: 'https://example.com/og.jpg',
                moderationResult: null,
                handle: 'user.bsky.social',
            });

            expect(mockPrisma.bookmark.upsert).toHaveBeenCalled();
            const call = mockPrisma.bookmark.upsert.mock.calls[0][0];
            expect(call.where.uri).toBe('at://did:plc:abc/blue.rito.feed.bookmark/123');
        });
    });

    describe('upsertComment', () => {
        it('should upsert comment', async () => {
            mockPrisma.comment.upsert.mockResolvedValue({});

            await dbService.upsertComment({
                bookmarkUri: 'at://did:plc:abc/blue.rito.feed.bookmark/123',
                lang: 'ja',
                title: 'タイトル',
                comment: 'コメント',
                moderationResult: null,
            });

            expect(mockPrisma.comment.upsert).toHaveBeenCalled();
        });
    });

    describe('deleteCommentsNotInLangs', () => {
        it('should delete comments not in specified languages', async () => {
            mockPrisma.comment.deleteMany.mockResolvedValue({ count: 2 });

            await dbService.deleteCommentsNotInLangs('at://did:plc:abc/blue.rito.feed.bookmark/123', ['ja', 'en']);

            expect(mockPrisma.comment.deleteMany).toHaveBeenCalledWith({
                where: {
                    bookmark_uri: 'at://did:plc:abc/blue.rito.feed.bookmark/123',
                    NOT: {
                        lang: { in: ['ja', 'en'] },
                    },
                },
            });
        });
    });

    describe('safeUpsertTag', () => {
        it('should return tag on success', async () => {
            mockPrisma.tag.upsert.mockResolvedValue({ id: 1, name: 'test' });

            const result = await dbService.safeUpsertTag('test');

            expect(result).toEqual({ id: 1, name: 'test' });
        });

        it('should return null on error', async () => {
            mockPrisma.tag.upsert.mockRejectedValue(new Error('Unique constraint'));

            const result = await dbService.safeUpsertTag('test');

            expect(result).toBeNull();
        });
    });

    describe('getBookmarkTagIds', () => {
        it('should return tag IDs', async () => {
            mockPrisma.bookmarkTag.findMany.mockResolvedValue([
                { tag_id: 1 },
                { tag_id: 2 },
                { tag_id: 3 },
            ]);

            const result = await dbService.getBookmarkTagIds('at://bookmark');

            expect(result).toEqual([1, 2, 3]);
        });

        it('should return empty array when no tags', async () => {
            mockPrisma.bookmarkTag.findMany.mockResolvedValue([]);

            const result = await dbService.getBookmarkTagIds('at://bookmark');

            expect(result).toEqual([]);
        });
    });

    describe('deleteBookmarkTags', () => {
        it('should delete specified tags', async () => {
            mockPrisma.bookmarkTag.deleteMany.mockResolvedValue({ count: 2 });

            await dbService.deleteBookmarkTags('at://bookmark', [1, 2]);

            expect(mockPrisma.bookmarkTag.deleteMany).toHaveBeenCalledWith({
                where: { bookmark_uri: 'at://bookmark', tag_id: { in: [1, 2] } },
            });
        });
    });

    describe('createBookmarkTag', () => {
        it('should create bookmark tag', async () => {
            mockPrisma.bookmarkTag.create.mockResolvedValue({});

            await dbService.createBookmarkTag('at://bookmark', 5);

            expect(mockPrisma.bookmarkTag.create).toHaveBeenCalledWith({
                data: { bookmark_uri: 'at://bookmark', tag_id: 5 },
            });
        });
    });

    describe('findPostToBookmark', () => {
        it('should find post to bookmark record', async () => {
            mockPrisma.postToBookmark.findUnique.mockResolvedValue({ sub: 'did:plc:abc', lang: 'ja' });

            const result = await dbService.findPostToBookmark('did:plc:abc');

            expect(result).toEqual({ sub: 'did:plc:abc', lang: 'ja' });
        });

        it('should return null when not found', async () => {
            mockPrisma.postToBookmark.findUnique.mockResolvedValue(null);

            const result = await dbService.findPostToBookmark('did:plc:nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findExistingBookmark', () => {
        it('should find existing bookmark', async () => {
            mockPrisma.bookmark.findFirst.mockResolvedValue({ uri: 'at://bookmark' });

            const result = await dbService.findExistingBookmark('did:plc:abc', 'https://example.com');

            expect(result).toEqual({ uri: 'at://bookmark' });
        });

        it('should return null when no bookmark exists', async () => {
            mockPrisma.bookmark.findFirst.mockResolvedValue(null);

            const result = await dbService.findExistingBookmark('did:plc:abc', 'https://new.com');

            expect(result).toBeNull();
        });
    });

    describe('upsertResolverRecord', () => {
        it('should upsert resolver', async () => {
            mockPrisma.resolver.upsert.mockResolvedValue({});

            await dbService.upsertResolverRecord('blue.rito.feed.bookmark', 'did:plc:abc', 'https://schema', true);

            expect(mockPrisma.resolver.upsert).toHaveBeenCalled();
        });
    });

    describe('upsertLikeRecord', () => {
        it('should upsert like', async () => {
            mockPrisma.like.upsert.mockResolvedValue({});
            const date = new Date();

            await dbService.upsertLikeRecord('at://like', 'at://subject', 'did:plc:abc', date);

            expect(mockPrisma.like.upsert).toHaveBeenCalledWith({
                where: { aturi: 'at://like' },
                update: { created_at: date },
                create: { aturi: 'at://like', subject: 'at://subject', did: 'did:plc:abc', created_at: date },
            });
        });
    });

    describe('deleteBookmark', () => {
        it('should delete bookmark and return count', async () => {
            mockPrisma.bookmark.deleteMany.mockResolvedValue({ count: 1 });

            const result = await dbService.deleteBookmark('at://bookmark');

            expect(result).toEqual({ count: 1 });
        });
    });

    describe('deleteLike', () => {
        it('should delete like and return count', async () => {
            mockPrisma.like.deleteMany.mockResolvedValue({ count: 1 });

            const result = await dbService.deleteLike('at://like');

            expect(result).toEqual({ count: 1 });
        });
    });

    describe('deleteResolver', () => {
        it('should delete resolver and return count', async () => {
            mockPrisma.resolver.deleteMany.mockResolvedValue({ count: 1 });

            const result = await dbService.deleteResolver('blue.rito.feed.bookmark', 'did:plc:abc');

            expect(result).toEqual({ count: 1 });
        });
    });
});
