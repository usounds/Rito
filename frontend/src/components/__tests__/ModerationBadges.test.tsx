import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModerationBadges } from '../ModerationBadges';

// Mock Mantine
vi.mock('@mantine/core', () => ({
    Badge: ({ children }: { children: React.ReactNode }) => (
        <span data-testid="moderation-badge">{children}</span>
    ),
    Group: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="moderation-group">{children}</div>
    ),
}));

describe('ModerationBadges', () => {
    it('モデレーションバッジを表示する', () => {
        render(<ModerationBadges moderations={['nsfw', 'spam']} />);
        expect(screen.getByText('nsfw')).toBeInTheDocument();
        expect(screen.getByText('spam')).toBeInTheDocument();
    });

    it('空のモデレーション配列では何も表示しない', () => {
        const { container } = render(<ModerationBadges moderations={[]} />);
        expect(container.querySelector('[data-testid="moderation-badge"]')).toBeNull();
    });

    it('単一のモデレーションを表示', () => {
        render(<ModerationBadges moderations={['adult']} />);
        const badges = screen.getAllByTestId('moderation-badge');
        expect(badges).toHaveLength(1);
    });

    it('複数のモデレーションを正しい数だけ表示', () => {
        render(<ModerationBadges moderations={['nsfw', 'spam', 'adult']} />);
        const badges = screen.getAllByTestId('moderation-badge');
        expect(badges).toHaveLength(3);
    });
});
