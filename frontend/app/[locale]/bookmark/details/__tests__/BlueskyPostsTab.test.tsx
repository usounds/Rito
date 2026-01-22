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
            userProf: { did: 'did:plc:testuser' }
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

        // Slingshot API のレスポンス (1件目の投稿)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                value: {
                    $type: 'app.bsky.feed.post',
                    text: 'Hello world!',
                    createdAt: new Date().toISOString()
                }
            })
        });

        // Slingshot API のレスポンス (2件目の投稿)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                value: {
                    $type: 'app.bsky.feed.post',
                    text: 'Bluesky is cool',
                    createdAt: new Date().toISOString()
                }
            })
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('Hello world!')).toBeInTheDocument();
            expect(screen.getByText('Bluesky is cool')).toBeInTheDocument();
        });

        expect(screen.getByText('by @did:plc:user1')).toBeInTheDocument();
        expect(screen.getByText('by @did:plc:user2')).toBeInTheDocument();
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

        // 初期ロード (2件分)
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ value: { $type: 'app.bsky.feed.post', text: 'Post 1' } }) });
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ value: { $type: 'app.bsky.feed.post', text: 'Post 2' } }) });

        // 追加ロード (1件分)
        (global.fetch as any).mockResolvedValueOnce({ ok: true, json: async () => ({ value: { $type: 'app.bsky.feed.post', text: 'Post 3' } }) });

        vi.mocked(useIntersection).mockImplementation(() => ({
            ref: vi.fn(),
            entry: { isIntersecting: true } as any // インターセクション発生状態
        }));

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('Post 1')).toBeInTheDocument();
            expect(screen.getByText('Post 2')).toBeInTheDocument();
        });

        // Intersection Observer が発火して loadMorePosts が呼ばれるのを待つ
        await waitFor(() => {
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

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                value: {
                    $type: 'app.bsky.feed.post',
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
                    ],
                    createdAt: new Date().toISOString()
                }
            })
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

        // 1件目: 不明なファセットタイプ (プレーンテキストとして表示されるはず)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                value: {
                    $type: 'app.bsky.feed.post',
                    text: 'Unknown facet',
                    facets: [{ index: { byteStart: 0, byteEnd: 7 }, features: [{ $type: 'unknown' }] }],
                    createdAt: new Date().toISOString()
                }
            })
        });

        // 2件目: fetch は ok だが $type が違う (スキップされるはず)
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                value: { $type: 'other.type' }
            })
        });

        // 3件目: fetch エラー (スキップされるはず)
        (global.fetch as any).mockResolvedValueOnce({ ok: false });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('Unknown facet')).toBeInTheDocument();
        });

        // 2件目と3件目は表示されないはず
        expect(screen.queryByText('by @did:plc:u2')).not.toBeInTheDocument();
        expect(screen.queryByText('by @did:plc:u3')).not.toBeInTheDocument();
    });

    it('レコード取得中に例外が発生しても処理を続行する', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                linking_records: [
                    { did: 'did:plc:u1', collection: 'app.bsky.feed.post', rkey: 'p1' },
                    { did: 'did:plc:u2', collection: 'app.bsky.feed.post', rkey: 'p2' }
                ]
            })
        });

        // 1件目: 例外発生
        (global.fetch as any).mockRejectedValueOnce(new Error('Network failure'));

        // 2件目: 正常
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                value: {
                    $type: 'app.bsky.feed.post',
                    text: 'Success after failure',
                    createdAt: new Date().toISOString()
                }
            })
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('Success after failure')).toBeInTheDocument();
        });
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

        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                value: {
                    $type: 'app.bsky.feed.post',
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
                    ],
                    createdAt: new Date().toISOString()
                }
            })
        });

        render(<BlueskyPostsTab subjectUrl="https://example.com" locale="ja" />);

        await waitFor(() => {
            expect(screen.getByText('@u1')).toBeInTheDocument();
            expect(screen.getByText('#tag')).toBeInTheDocument();
        });
    });
});
