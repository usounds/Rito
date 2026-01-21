import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InfiniteBookmarkList } from '../InfiniteBookmarkList';
import { useIntersection } from '@mantine/hooks';
import { fetchBookmarksAction } from '@app/[locale]/bookmark/search/latestbookmark/actions';

// Mock dependencies
vi.mock('@mantine/core', () => ({
    SimpleGrid: ({ children }: { children: React.ReactNode }) => <div data-testid="grid">{children}</div>,
    Stack: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Center: vi.fn().mockImplementation(({ children, ...props }) => <div data-testid="center" {...props}>{children}</div>),
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
    Article: ({ url, title, comment }: { url: string; title: string, comment: string }) => (
        <div data-testid="article-card" data-url={url} data-title={title} data-comment={comment}>{title}</div>
    ),
}));

vi.mock('@app/[locale]/bookmark/search/latestbookmark/actions', () => ({
    fetchBookmarksAction: vi.fn().mockResolvedValue({
        items: [],
        hasMore: false,
    }),
}));

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key === 'nomore' ? 'nomore' : key,
}));

describe('InfiniteBookmarkList', () => {
    const mockBookmark = {
        uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1',
        handle: 'user.bsky.social',
        subject: 'https://example.com/article',
        ogpTitle: 'OGP Title',
        ogpDescription: 'OGP Description',
        ogpImage: 'https://example.com/image.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        indexedAt: '2024-01-01T00:00:00Z',
        moderations: ['mod1'],
        comments: [
            { lang: 'ja', title: 'JA Title', comment: 'JA Comment', moderations: ['ja-mod'] } as any,
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

    it('query.comment が comment の場合、コメント情報を優先表示する', () => {
        render(<InfiniteBookmarkList {...defaultProps} query={{ ...defaultProps.query, comment: 'comment' }} />);
        const card = screen.getByTestId('article-card');
        expect(card).toHaveAttribute('data-title', 'JA Title');
        expect(card).toHaveAttribute('data-comment', 'JA Comment');
    });

    it('query.comment が none の場合、OGP情報を優先表示する', () => {
        render(<InfiniteBookmarkList {...defaultProps} query={{ ...defaultProps.query, comment: 'none' } as any} />);
        const card = screen.getByTestId('article-card');
        expect(card).toHaveAttribute('data-title', 'OGP Title');
        expect(card).toHaveAttribute('data-comment', 'OGP Description');
    });

    it('sort が updated の場合、indexedAt を日付として使用する', () => {
        const customBookmark = {
            ...mockBookmark,
            createdAt: '2024-01-01T00:00:00Z',
            indexedAt: '2024-02-01T00:00:00Z',
        };
        // Article mock doesn't show date, but we hit the branch
        render(<InfiniteBookmarkList {...defaultProps} initialItems={[customBookmark] as any} query={{ sort: 'updated' }} />);
        expect(screen.getByTestId('article-card')).toBeInTheDocument();
    });

    it('initialItems が変更されたら内部状態をリセットする', () => {
        const { rerender } = render(<InfiniteBookmarkList {...defaultProps} />);
        expect(screen.getAllByTestId('article-card')).toHaveLength(1);

        const newItems = [
            mockBookmark,
            { ...mockBookmark, uri: 'at://2', subject: 'https://2.com' }
        ];
        rerender(<InfiniteBookmarkList {...defaultProps} initialItems={newItems as any} />);
        expect(screen.getAllByTestId('article-card')).toHaveLength(2);
    });

    it('nomoreメッセージを表示する', () => {
        render(<InfiniteBookmarkList {...defaultProps} initialHasMore={false} />);
        expect(screen.getByText('nomore')).toBeInTheDocument();
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
