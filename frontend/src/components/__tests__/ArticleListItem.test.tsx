import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test-utils';
import { ArticleListItem } from '../bookmarkcard/ArticleListItem';

vi.mock('../bookmarkcard/ArticleListItem.module.scss', () => ({
    default: {},
}));

vi.mock('next/link', () => ({
    default: ({ children, href, prefetch }: { children: React.ReactNode; href: string; prefetch?: boolean }) => (
        <a href={href} data-prefetch={String(prefetch)}>{children}</a>
    ),
}));

vi.mock('next-intl', () => ({
    useLocale: () => 'ja',
    useMessages: () => ({ detail: { view: '詳細を見る' } }),
}));

vi.mock('next/dynamic', () => ({
    default: () => ({ children }: { children: string }) => <span>{children}</span>,
}));

vi.mock('@/components/BlurReveal', () => ({
    BlurReveal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ModerationBadges', () => ({
    ModerationBadges: () => null,
}));

vi.mock('@/components/TagBadge', () => ({
    TagBadge: () => null,
}));

vi.mock('@/components/EditMenu', () => ({
    default: () => null,
}));

vi.mock('@/components/TimeAgo', () => ({
    default: () => null,
}));

vi.mock('@/components/Like', () => ({
    default: () => null,
}));

vi.mock('@/components/ArticleImage', () => ({
    default: ({ sizes }: { sizes?: string }) => <span data-testid="article-image" data-sizes={sizes} />,
}));

vi.mock('lucide-react', () => ({
    Globe: () => null,
    Users: () => null,
}));

describe('ArticleListItem', () => {
    it('記事詳細ページを先読みしない', () => {
        render(
            <ArticleListItem
                url="https://example.com/article"
                title="テスト記事"
                comment=""
                tags={[]}
                moderations={[]}
            />,
        );

        const link = screen.getByText('テスト記事').closest('a');
        expect(link).toHaveAttribute(
            'href',
            '/ja/bookmark/details?uri=https%3A%2F%2Fexample.com%2Farticle',
        );
        expect(link).toHaveAttribute('data-prefetch', 'false');
        expect(screen.getByTestId('article-image')).toHaveAttribute('data-sizes', '100px');
    });
});
