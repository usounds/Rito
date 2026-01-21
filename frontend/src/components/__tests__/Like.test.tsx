import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import Like from '../Like';
import { useXrpcAgentStore } from '@/state/XrpcAgent';
import { notifications } from '@mantine/notifications';

// Mock dependencies
const mockPost = vi.fn().mockResolvedValue({ ok: true });
const mockGet = vi.fn().mockResolvedValue({ ok: true, data: { profiles: [] } });

vi.mock('@/state/XrpcAgent', () => ({
    useXrpcAgentStore: vi.fn((selector) => {
        const state = {
            activeDid: 'did:plc:testuser',
            thisClient: { post: mockPost },
            publicAgent: { get: mockGet },
        };
        return selector(state);
    }),
}));

vi.mock('@mantine/notifications', () => ({
    notifications: {
        show: vi.fn().mockReturnValue('notification-id'),
        hide: vi.fn(),
    },
}));

vi.mock('@/components/Authentication', () => ({
    Authentication: () => <div data-testid="auth-modal">Login Form</div>,
}));

vi.mock('lucide-react', () => ({
    Heart: () => <span data-testid="heart-icon">♡</span>,
    Check: () => <span>✓</span>,
    X: () => <span>✗</span>,
}));

describe('Like', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
        });
        // Restore default mock state
        vi.mocked(useXrpcAgentStore).mockImplementation((selector: any) => {
            const state = {
                activeDid: 'did:plc:testuser',
                thisClient: { post: mockPost },
                publicAgent: { get: mockGet },
            };
            return selector(state);
        });
        mockPost.mockResolvedValue({ ok: true });
        mockGet.mockResolvedValue({ ok: true, data: { profiles: [] } });
    });

    it('いいねボタンを表示する', () => {
        render(<Like subject="https://example.com" likedBy={[]} />);
        expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    });

    it('いいね数を正しく表示する', () => {
        render(
            <Like
                subject="https://example.com"
                likedBy={['at://did:plc:a/blue.rito.feed.like/1', 'at://did:plc:b/blue.rito.feed.like/2']}
            />
        );
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('いいね数が0の場合でも表示', () => {
        render(<Like subject="https://example.com" likedBy={[]} />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('actionDisabledでボタンを無効化', () => {
        const { container } = render(<Like subject="https://example.com" likedBy={[]} actionDisabled={true} />);
        const button = container.querySelector('button');
        expect(button).toBeDisabled();
    });

    it('既にいいね済みのユーザーがある場合isLikedがtrue', () => {
        render(
            <Like
                subject="https://example.com"
                likedBy={['at://did:plc:testuser/blue.rito.feed.like/123']}
            />
        );
        expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    });

    it('クリックでいいねを追加（未いいね状態）', async () => {
        render(<Like subject="https://example.com" likedBy={[]} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('com.atproto.repo.applyWrites', expect.anything());
        });
    });

    it('クリックでいいねを削除（いいね済み状態）', async () => {
        render(
            <Like
                subject="https://example.com"
                likedBy={['at://did:plc:testuser/blue.rito.feed.like/existing']}
            />
        );

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalledWith('com.atproto.repo.applyWrites', expect.objectContaining({
                input: expect.objectContaining({
                    writes: expect.arrayContaining([
                        expect.objectContaining({ $type: 'com.atproto.repo.applyWrites#delete' })
                    ])
                })
            }));
        });
    });

    it('API失敗時にいいね追加のエラー通知を表示', async () => {
        mockPost.mockResolvedValueOnce({ ok: false });

        render(<Like subject="https://example.com" likedBy={[]} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
            expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }));
        });
    });

    it('API失敗時にいいね削除のエラー通知を表示', async () => {
        mockPost.mockResolvedValueOnce({ ok: false });

        render(
            <Like
                subject="https://example.com"
                likedBy={['at://did:plc:testuser/blue.rito.feed.like/existing']}
            />
        );

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
            expect(notifications.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error' }));
        });
    });

    it('Hoverでプロフィールを取得する', async () => {
        mockGet.mockResolvedValueOnce({
            ok: true,
            data: {
                profiles: [{ did: 'did:plc:a', displayName: 'User A', handle: 'a.test', avatar: 'url' }]
            }
        });

        render(
            <Like
                subject="https://example.com"
                likedBy={['at://did:plc:a/blue.rito.feed.like/1']}
            />
        );

        const countText = screen.getByText('1');
        fireEvent.mouseEnter(countText);

        // We expect publicAgent.get to be called
        await waitFor(() => {
            expect(mockGet).toHaveBeenCalledWith('app.bsky.actor.getProfiles', expect.anything());
        });
    });

    it('ログインしていない場合にボタンクリックでログインモーダルを表示', async () => {
        vi.mocked(useXrpcAgentStore).mockImplementation((selector: any) => {
            const state = {
                activeDid: null,
                thisClient: { post: mockPost },
                publicAgent: { get: mockGet },
            };
            return selector(state);
        });

        render(<Like subject="https://example.com" likedBy={[]} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
        }, { timeout: 2000 });
    });
});
