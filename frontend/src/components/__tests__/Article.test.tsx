import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { Article } from '../bookmarkcard/Article';
import { parseCanonicalResourceUri } from '@atcute/lexicons/syntax';
import { nsidSchema } from '@/nsid/mapping';

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

vi.mock('next-intl', () => ({
    useLocale: () => 'ja',
    useMessages: () => ({
        detail: {
            view: '詳細を見る',
        },
    }),
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
    default: ({ src }: { src: string }) => <img data-testid="article-image" src={src} alt="article" />,
}));

vi.mock('@/components/EditMenu', () => ({
    default: () => <div data-testid="edit-menu" />,
}));

vi.mock('lucide-react', () => ({
    SquarePen: () => <span>✎</span>,
    Trash2: () => <span data-testid="trash-icon">🗑</span>,
    CircleEllipsis: () => <span data-testid="circle-ellipsis">...</span>,
    BookmarkPlus: () => <span data-testid="bookmark-plus">+</span>,
    Share: () => <span data-testid="share">Share</span>,
}));

vi.mock('@atcute/lexicons/syntax', () => ({
    parseCanonicalResourceUri: vi.fn().mockImplementation(() => ({ ok: false })),
}));

vi.mock('@/nsid/mapping', () => ({
    nsidSchema: [
        { nsid: 'app.bsky.feed.post', schema: 'https://bsky.app/profile/{did}/post/{rkey}' }
    ],
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
        expect(screen.getByText('テスト記事')).toBeInTheDocument();
    });

    it('ハンドルを表示する', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByText(/user.bsky.social/)).toBeInTheDocument();
    });

    it('EditMenuを表示する', () => {
        render(<Article {...defaultProps} />);
        expect(screen.getByTestId('edit-menu')).toBeInTheDocument();
    });

    it('at:// URIを正しく解析して表示', () => {
        vi.mocked(parseCanonicalResourceUri).mockReturnValueOnce({
            ok: true,
            value: { repo: 'did:plc:user', collection: 'app.bsky.feed.post', rkey: 'post123' }
        } as any);

        render(<Article {...defaultProps} url="at://did:plc:user/app.bsky.feed.post/post123" />);

        // localUrl should be https://bsky.app/profile/did:plc:user/post/post123
        // domain should be bsky.app
        expect(screen.getByText(/bsky.app/)).toBeInTheDocument();
    });

    it('解析できないat:// URIの場合はデフォルトドメインを表示', () => {
        vi.mocked(parseCanonicalResourceUri).mockReturnValueOnce({ ok: false } as any);
        render(<Article {...defaultProps} url="at://invalid" />);
        expect(screen.getByText(/invalid/)).toBeInTheDocument();
    });

    it('スキーマが見つからないat:// URIの場合はpdsls.devを表示', () => {
        vi.mocked(parseCanonicalResourceUri).mockReturnValueOnce({
            ok: true,
            value: { repo: 'did:plc:user', collection: 'unknown.nsid', rkey: 'rkey' }
        } as any);
        render(<Article {...defaultProps} url="at://did:plc:user/unknown.nsid/rkey" />);
        expect(screen.getByText(/pdsls.dev/)).toBeInTheDocument();
    });

    it('相対画像パスを絶対URLに変換する', () => {
        render(<Article {...defaultProps} image="avatar.jpg" url="https://mysite.com/page" />);
        const img = screen.getByTestId('article-image');
        expect(img).toHaveAttribute('src', 'https://mysite.com/avatar.jpg');
    });



    it('無効なURLの場合は元のURLをドメインとして表示', () => {
        render(<Article {...defaultProps} url="invalid-url" />);
        expect(screen.getByText(/invalid-url/)).toBeInTheDocument();
    });
});
