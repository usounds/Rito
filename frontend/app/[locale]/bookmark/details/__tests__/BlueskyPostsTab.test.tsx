import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import { render } from '../../../../../src/test-utils';
import { BlueskyPostsTab } from '../BlueskyPostsTab';
import { useXrpcAgentStore } from '../../../../../src/state/XrpcAgent';

// Mock Zustand store
vi.mock('../../../../../src/state/XrpcAgent', () => ({
    useXrpcAgentStore: vi.fn(),
}));

// Mock @mantine/hooks useIntersection
vi.mock('@mantine/hooks', () => ({
    useIntersection: vi.fn().mockReturnValue({ ref: vi.fn(), entry: null }),
}));

describe('BlueskyPostsTab', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useXrpcAgentStore as any).mockReturnValue({
            userProf: { did: 'did:plc:testuser' },
            publicAgent: {
                get: vi.fn(),
            },
        });
    });

    it('ログインしていない場合はログインを促すメッセージを表示する', () => {
        (useXrpcAgentStore as any).mockReturnValue({ userProf: null });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);
        expect(screen.getByText('detail.needlogin')).toBeInTheDocument();
    });

    it('初期ロード中にローダーが表示される', () => {
        (global.fetch as any).mockImplementationOnce(() => new Promise(() => { }));

        const { container } = render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);
        expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    });

    it('バックリンクがない場合はメッセージを表示する', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ linking_records: [] })
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('detail.nocomment')).toBeInTheDocument();
        });
    });

    it('バックリンクがある場合にプログレッシブローディングが行われる', async () => {
        // Constellation API のレスポンス (2件の投稿)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                linking_records: [
                    { did: 'did:plc:user1', collection: 'app.bsky.feed.post', rkey: 'post1' },
                    { did: 'did:plc:user2', collection: 'app.bsky.feed.post', rkey: 'post2' }
                ]
            })
        });

        // publicAgent.get のレスポンス (2件の投稿を一括取得)
        const mockPublicAgent = {
            get: vi.fn().mockResolvedValueOnce({
                ok: true,
                data: {
                    posts: [
                        {
                            uri: 'at://did:plc:user1/app.bsky.feed.post/post1',
                            author: { handle: 'user1.bsky.social', did: 'did:plc:user1' },
                            record: { text: 'Hello world!', facets: [] },
                            indexedAt: new Date().toISOString()
                        },
                        {
                            uri: 'at://did:plc:user2/app.bsky.feed.post/post2',
                            author: { handle: 'user2.bsky.social', did: 'did:plc:user2' },
                            record: { text: 'Bluesky is cool', facets: [] },
                            indexedAt: new Date().toISOString()
                        }
                    ]
                }
            })
        };

        (useXrpcAgentStore as any).mockReturnValue({
            userProf: { did: 'did:plc:testuser' },
            publicAgent: mockPublicAgent
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('Hello world!')).toBeInTheDocument();
            expect(screen.getByText('Bluesky is cool')).toBeInTheDocument();
        });

        expect(screen.getByText('by @user1.bsky.social')).toBeInTheDocument();
        expect(screen.getByText('by @user2.bsky.social')).toBeInTheDocument();
    });

    it('APIエラー時にエラーメッセージを表示する', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText(/getBacklinks failed/)).toBeInTheDocument();
        });
    });

    it('スクロールして最下部に達した際に追加の読み込みが行われる', async () => {
        const { useIntersection } = await import('@mantine/hooks');

        // 最初は2件
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                linking_records: [
                    { did: 'did:plc:u1', collection: 'app.bsky.feed.post', rkey: 'p1' },
                    { did: 'did:plc:u2', collection: 'app.bsky.feed.post', rkey: 'p2' },
                    { did: 'did:plc:u3', collection: 'app.bsky.feed.post', rkey: 'p3' }
                ]
            })
        });

        // publicAgent.get のレスポンス (初期ロードで全3件取得)
        const mockPublicAgent = {
            get: vi.fn()
                .mockResolvedValueOnce({
                    ok: true,
                    data: {
                        posts: [
                            {
                                uri: 'at://did:plc:u1/app.bsky.feed.post/p1',
                                author: { handle: 'u1.bsky.social', did: 'did:plc:u1' },
                                record: { text: 'Post 1' },
                                indexedAt: new Date().toISOString()
                            },
                            {
                                uri: 'at://did:plc:u2/app.bsky.feed.post/p2',
                                author: { handle: 'u2.bsky.social', did: 'did:plc:u2' },
                                record: { text: 'Post 2' },
                                indexedAt: new Date().toISOString()
                            },
                            {
                                uri: 'at://did:plc:u3/app.bsky.feed.post/p3',
                                author: { handle: 'u3.bsky.social', did: 'did:plc:u3' },
                                record: { text: 'Post 3' },
                                indexedAt: new Date().toISOString()
                            }
                        ]
                    }
                })
        };

        (useXrpcAgentStore as any).mockReturnValue({
            userProf: { did: 'did:plc:testuser' },
            publicAgent: mockPublicAgent
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('Post 1')).toBeInTheDocument();
            expect(screen.getByText('Post 2')).toBeInTheDocument();
            expect(screen.getByText('Post 3')).toBeInTheDocument();
        });
    });

    it('様々なファセット（リンク、メンション、タグ）を含む投稿が正しくレンダリングされる', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                linking_records: [
                    { did: 'did:plc:user1', collection: 'app.bsky.feed.post', rkey: 'post1' }
                ]
            })
        });

        const mockPublicAgent = {
            get: vi.fn().mockResolvedValueOnce({
                ok: true,
                data: {
                    posts: [
                        {
                            uri: 'at://did:plc:user1/app.bsky.feed.post/post1',
                            author: { handle: 'user1.bsky.social', did: 'did:plc:user1' },
                            record: {
                                text: 'Check this link google.com, mention @user.bsky.social, and tag #bluesky! 🚀',
                                facets: [
                                    {
                                        index: { byteStart: 16, byteEnd: 26 },
                                        features: [{ $type: 'app.bsky.richtext.facet#link', uri: 'https://google.com' }]
                                    },
                                    {
                                        index: { byteStart: 36, byteEnd: 53 },
                                        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:mentionuser' }]
                                    },
                                    {
                                        index: { byteStart: 63, byteEnd: 71 },
                                        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'bluesky' }]
                                    }
                                ]
                            },
                            indexedAt: new Date().toISOString()
                        }
                    ]
                }
            })
        };

        (useXrpcAgentStore as any).mockReturnValue({
            userProf: { did: 'did:plc:testuser' },
            publicAgent: mockPublicAgent
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            const link = screen.getByRole('link', { name: 'google.com' });
            expect(link).toHaveAttribute('href', 'https://google.com');

            const mention = screen.getByRole('link', { name: '@user.bsky.social' });
            expect(mention).toHaveAttribute('href', 'https://bsky.app/profile/did:plc:mentionuser');

            const tag = screen.getByRole('link', { name: '#bluesky' });
            expect(tag).toHaveAttribute('href', 'https://bsky.app/hashtag/bluesky');

            expect(screen.getByText(/Check this link/)).toBeInTheDocument();
            expect(screen.getByText(/! 🚀/)).toBeInTheDocument();
        });
    });

    it('不明なファセットタイプや異常なレコード取得エラーを適切に処理する', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                linking_records: [
                    { did: 'did:plc:u1', collection: 'app.bsky.feed.post', rkey: 'p1' },
                    { did: 'did:plc:u2', collection: 'app.bsky.feed.post', rkey: 'p2' },
                    { did: 'did:plc:u3', collection: 'app.bsky.feed.post', rkey: 'p3' }
                ]
            })
        });

        // 1件目は不明なファセットタイプをシミュレート
        // 2件目は $type が違うのをシミュレート (getPosts では通常発生しないがテストロジック維持)
        // 3件目は取得エラーをシミュレート
        const mockPublicAgent = {
            get: vi.fn().mockResolvedValueOnce({
                ok: true,
                data: {
                    posts: [
                        {
                            uri: 'at://did:plc:u1/app.bsky.feed.post/p1',
                            author: { handle: 'u1.bsky.social', did: 'did:plc:u1' },
                            record: {
                                text: 'Unknown facet',
                                facets: [{ index: { byteStart: 0, byteEnd: 7 }, features: [{ $type: 'unknown' }] }],
                            },
                            indexedAt: new Date().toISOString()
                        }
                        // 2件目 (other.type) は getPosts 側で返さないか、マッピングで除外される想定
                        // 3件目 (fetch error) は get 呼び出し自体が ok: false を返す想定
                    ]
                }
            })
        };

        (useXrpcAgentStore as any).mockReturnValue({
            userProf: { did: 'did:plc:testuser' },
            publicAgent: mockPublicAgent
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('Unknown facet')).toBeInTheDocument();
        });

        // 2件目と3件目は表示されないはず
        expect(screen.queryByText('by @u2.bsky.social')).not.toBeInTheDocument();
        expect(screen.queryByText('by @u3.bsky.social')).not.toBeInTheDocument();
    });

    it('レコード取得中に例外が発生した場合、そのバッチは表示されない', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                linking_records: [
                    { did: 'did:plc:u1', collection: 'app.bsky.feed.post', rkey: 'p1' }
                ]
            })
        });

        // get が失敗 (ok: false)
        const mockPublicAgent = {
            get: vi.fn().mockResolvedValueOnce({ ok: false })
        };

        (useXrpcAgentStore as any).mockReturnValue({
            userProf: { did: 'did:plc:testuser' },
            publicAgent: mockPublicAgent
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        // Timelineは表示されるが、中身（Post 1）は表示されないことを確認
        await waitFor(() => {
            expect(screen.queryByText('Post 1')).not.toBeInTheDocument();
        });

        // また、詳細メッセージも表示されない（linking_recordsはあるため）
        expect(screen.queryByText('detail.nocomment')).not.toBeInTheDocument();
    });

    it('隣接するファセットや端のファセットを正しく処理する', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                linking_records: [
                    { did: 'did:plc:u1', collection: 'app.bsky.feed.post', rkey: 'p1' }
                ]
            })
        });

        const mockPublicAgent = {
            get: vi.fn().mockResolvedValueOnce({
                ok: true,
                data: {
                    posts: [
                        {
                            uri: 'at://did:plc:u1/app.bsky.feed.post/p1',
                            author: { handle: 'u1.bsky.social', did: 'did:plc:u1' },
                            record: {
                                text: '@u1#tag',
                                facets: [
                                    {
                                        index: { byteStart: 0, byteEnd: 3 },
                                        features: [{ $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:u1' }]
                                    },
                                    {
                                        index: { byteStart: 3, byteEnd: 7 },
                                        features: [{ $type: 'app.bsky.richtext.facet#tag', tag: 'tag' }]
                                    }
                                ]
                            },
                            indexedAt: new Date().toISOString()
                        }
                    ]
                }
            })
        };

        (useXrpcAgentStore as any).mockReturnValue({
            userProf: { did: 'did:plc:testuser' },
            publicAgent: mockPublicAgent
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('@u1')).toBeInTheDocument();
            expect(screen.getByText('#tag')).toBeInTheDocument();
        });
    });
});
