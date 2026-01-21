import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { Article } from '../bookmarkcard/Article';

// Mock SCSS module
vi.mock('../bookmarkcard/Article.module.scss', () => ({
    default: {
        card: 'card',
        footer: 'footer',
    },
}));

// Mock dependencies
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('next/dynamic', () => ({
    default: () => ({ children }: { children: string }) => <p>{children}</p>,
}));

vi.mock('@/components/BlurReveal', () => ({
    BlurReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ModerationBadges', () => ({
    ModerationBadges: () => <div data-testid="moderation-badges" />,
}));

vi.mock('@/components/TagBadge', () => ({
    TagBadge: ({ tags }: { tags: string[] }) => <div data-testid="tag-badge">{tags.join(',')}</div>,
}));

vi.mock('@/components/TimeAgo', () => ({
    default: () => <span data-testid="time-ago">1日前</span>,
}));

vi.mock('@/components/Like', () => ({
    default: () => <div data-testid="like-component" />,
}));

vi.mock('@/components/DeleteBookmark', () => ({
    DeleteBookmark: () => <div>Delete Modal</div>,
}));

vi.mock('@/components/ArticleImage', () => ({
    default: () => <img data-testid="article-image" alt="article" />,
}));

vi.mock('lucide-react', () => ({
    SquarePen: () => <span>✎</span>,
    Trash2: () => <span>🗑</span>,
}));

vi.mock('@atcute/lexicons/syntax', () => ({
    parseCanonicalResourceUri: () => ({ ok: false }),
}));

vi.mock('@/nsid/mapping', () => ({
    nsidSchema: [],
}));

describe('Article', () => {
    const defaultProps = {
        url: 'https://example.com/article',
        title: 'テスト記事',
        handle: 'user.bsky.social',
        comment: 'これはテストコメントです',
        tags: ['test', 'article'],
        image: 'https://example.com/image.jpg',
        date: new Date('2024-01-01'),
        moderations: [] as string[],
        likes: [] as string[],
    };

    it('記事カードを表示する', () => {
        render(<Article {...defaultProps} />);
        // Article内のテキストが表示されていることを確認
        expect(screen.getByText('テスト記事')).toBeInTheDocument();
    });

    it('タイトルを表示する', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByText('テスト記事')).toBeInTheDocument();
    });

    it('ハンドルを表示する', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByText(/user.bsky.social/)).toBeInTheDocument();
    });

    it('タグを表示する', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByTestId('tag-badge')).toBeInTheDocument();
    });

    it('いいねコンポーネントを表示する', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByTestId('like-component')).toBeInTheDocument();
    });

    it('時間表示を含む', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByTestId('time-ago')).toBeInTheDocument();
    });

    it('aturiがある場合は編集・削除ボタンを表示', () => {
        render(<Article {...defaultProps} atUri="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" />);
        expect(screen.getByText('✎')).toBeInTheDocument();
        expect(screen.getByText('🗑')).toBeInTheDocument();
    });

    it('aturiがない場合は編集・削除ボタンを非表示', () => {
        render(<Article {...defaultProps} />);
        expect(screen.queryByText('✎')).not.toBeInTheDocument();
    });

    it('ドメインを正しく抽出して表示', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByText(/example.com/)).toBeInTheDocument();
    });
});
