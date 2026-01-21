import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InfiniteBookmarkList } from '../InfiniteBookmarkList';
import { useIntersection } from '@mantine/hooks';
import { fetchBookmarksAction } from '@app/[locale]/bookmark/search/latestbookmark/actions';

// Mock dependencies
vi.mock('@mantine/core', () => ({
    SimpleGrid: ({ children }: { children: React.ReactNode }) => <div data-testid="grid">{children}</div>,
    Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Center: ({ children }: { children: React.ReactNode }) => <div data-testid="center">{children}</div>,
    Loader: () => <div data-testid="loader">Loading...</div>,
    Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Box: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@mantine/hooks', () => ({
    useIntersection: vi.fn().mockReturnValue({
        ref: { current: null },
        entry: { isIntersecting: false },
    }),
}));

vi.mock('@/components/bookmarkcard/Article', () => ({
    Article: ({ url, title }: { url: string; title: string }) => (
        <div data-testid="article-card" data-url={url}>{title}</div>
    ),
}));

vi.mock('@app/[locale]/bookmark/search/latestbookmark/actions', () => ({
    fetchBookmarksAction: vi.fn().mockResolvedValue({
        items: [],
        hasMore: false,
    }),
}));

describe('InfiniteBookmarkList', () => {
    const mockBookmark = {
        uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1',
        handle: 'user.bsky.social',
        subject: 'https://example.com/article',
        ogpTitle: 'Test Article',
        ogpDescription: 'Description',
        ogpImage: 'https://example.com/image.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        indexedAt: '2024-01-01T00:00:00Z',
        moderations: [],
        comments: [
            { lang: 'ja', title: '日本語タイトル', comment: 'コメント', moderations: [] } as any,
        ],
        tags: ['test'],
        likes: [],
        commentCount: 1,
    };

    const defaultProps = {
        initialItems: [mockBookmark] as any[],
        initialHasMore: false,
        query: { page: 1 },
        locale: 'ja',
    };

    it('ブックマークリストを表示する', () => {
        render(<InfiniteBookmarkList {...defaultProps} />);
        expect(screen.getByTestId('grid')).toBeInTheDocument();
    });

    it('ブックマークカードを表示する', () => {
        render(<InfiniteBookmarkList {...defaultProps} />);
        expect(screen.getByTestId('article-card')).toBeInTheDocument();
    });

    it('複数のブックマークを表示する', () => {
        const props = {
            ...defaultProps,
            initialItems: [
                mockBookmark,
                { ...mockBookmark, uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/2' },
                { ...mockBookmark, uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/3' },
            ],
        };
        render(<InfiniteBookmarkList {...props as any} />);
        const cards = screen.getAllByTestId('article-card');
        expect(cards).toHaveLength(3);
    });

    it('hasMore=trueでローダー領域を表示', () => {
        render(<InfiniteBookmarkList {...defaultProps} initialHasMore={true} />);
        expect(screen.getByTestId('center')).toBeInTheDocument();
    });

    it('空リストを正しく処理', () => {
        render(<InfiniteBookmarkList {...defaultProps} initialItems={[]} />);
        expect(screen.queryByTestId('article-card')).not.toBeInTheDocument();
    });

    it('ロケールに基づいてコメントを選択', () => {
        const props = {
            ...defaultProps,
            initialItems: [{
                ...mockBookmark,
                comments: [
                    { lang: 'ja', title: '日本語', comment: 'JA', moderations: [] },
                    { lang: 'en', title: 'English', comment: 'EN', moderations: [] },
                ],
            }],
            locale: 'en',
        };
        render(<InfiniteBookmarkList {...props as any} />);
        expect(screen.getByTestId('article-card')).toBeInTheDocument();
    });

    it('交差時に loadMore を呼び出す', async () => {
        vi.mocked(fetchBookmarksAction).mockResolvedValueOnce({
            items: [{
                ...mockBookmark,
                uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/new',
                comments: [{ lang: 'ja', title: 'New Article', comment: 'New', moderations: [] }]
            }] as any,
            hasMore: false,
            totalCount: 1,
            totalPages: 1,
        } as any);

        // isIntersecting: true にして再レンダリングを促す
        vi.mocked(useIntersection).mockReturnValue({
            ref: { current: null },
            entry: { isIntersecting: true },
        } as any);

        render(<InfiniteBookmarkList {...defaultProps} initialHasMore={true} />);

        await waitFor(() => {
            expect(fetchBookmarksAction).toHaveBeenCalled();
            expect(screen.getByText('New Article')).toBeInTheDocument();
        });
    });
});
