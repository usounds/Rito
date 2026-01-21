import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TagBadge } from '../TagBadge';

// Mock next/link
vi.mock('next/link', () => ({
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock Mantine
vi.mock('@mantine/core', () => ({
    Group: ({ children }: { children: React.ReactNode }) => <div data-testid="group">{children}</div>,
    Badge: ({ children, color }: { children: React.ReactNode; color: string }) => (
        <span data-testid="badge" data-color={color}>{children}</span>
    ),
}));

describe('TagBadge', () => {
    it('タグをバッジとして表示する', async () => {
        render(<TagBadge tags={['test', 'example']} locale="ja" />);
        // useEffect後の状態をテスト
        await new Promise(r => setTimeout(r, 10));
        expect(screen.getByText(/test/)).toBeInTheDocument();
    });

    it('空のタグ配列ではnullを返す', () => {
        const { container } = render(<TagBadge tags={[]} locale="ja" />);
        expect(container.firstChild).toBeNull();
    });

    it('重複タグを除去する', async () => {
        render(<TagBadge tags={['tag1', 'tag1', 'tag2']} locale="ja" />);
        await new Promise(r => setTimeout(r, 10));
        const badges = screen.getAllByTestId('badge');
        expect(badges.length).toBe(2);
    });

    it('Verifiedタグを先頭に表示する', async () => {
        render(<TagBadge tags={['zzz', 'Verified', 'aaa']} locale="ja" />);
        await new Promise(r => setTimeout(r, 10));
        const badges = screen.getAllByTestId('badge');
        expect(badges[0]).toHaveTextContent('Verified');
    });

    it('Verifiedタグはorangeカラーで表示', async () => {
        render(<TagBadge tags={['Verified']} locale="ja" />);
        await new Promise(r => setTimeout(r, 10));
        const badge = screen.getByTestId('badge');
        expect(badge).toHaveAttribute('data-color', 'orange');
    });

    it('正しいリンクを生成する', async () => {
        render(<TagBadge tags={['mytag']} locale="en" />);
        await new Promise(r => setTimeout(r, 10));
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/en/bookmark/search?tag=mytag');
    });
});
