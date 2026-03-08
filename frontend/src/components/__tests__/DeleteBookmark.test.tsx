import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { render } from '../../test-utils';
import { DeleteBookmark } from '../DeleteBookmark';

// Mock dependencies
const mockPost = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@/state/XrpcAgent', () => ({
    useXrpcAgentStore: vi.fn((selector) => {
        const state = {
            activeDid: 'did:plc:testuser',
            thisClient: { post: mockPost },
        };
        return selector(state);
    }),
}));

const mockSetMyBookmark = vi.fn();
const mockSetIsNeedReload = vi.fn();

vi.mock('@/state/MyBookmark', () => ({
    useMyBookmark: Object.assign(
        vi.fn((selector) => {
            const state = {
                myBookmark: [{ uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/yyy' }],
                setMyBookmark: mockSetMyBookmark,
                setIsNeedReload: mockSetIsNeedReload,
            };
            return selector(state);
        }),
        {
            getState: () => ({
                myBookmark: [{ uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/yyy' }],
            }),
        }
    ),
}));

vi.mock('@mantine/notifications', () => ({
    notifications: {
        show: vi.fn().mockReturnValue('notification-id'),
        hide: vi.fn(),
    },
}));

vi.mock('lucide-react', () => ({
    Check: () => <span data-testid="check-icon">✓</span>,
    Trash: () => <span data-testid="trash-icon">🗑</span>,
    X: () => <span data-testid="x-icon">✗</span>,
}));

describe('DeleteBookmark', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({ shouldAdvanceTime: true });
        global.fetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
        });
    });

    afterEach(() => {
        cleanup();
        vi.runAllTimers();
        vi.useRealTimers();
    });

    it('削除確認UIを表示する', () => {
        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);
        expect(screen.getByText('削除しますか？')).toBeInTheDocument();
    });

    it('閉じるボタンでonCloseを呼び出す', () => {
        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);
        const closeButton = screen.getByText('閉じる');
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('削除ボタンを表示する', () => {
        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);
        expect(screen.getByText('削除')).toBeInTheDocument();
    });

    it('削除ボタンクリックでAPI呼び出し', async () => {
        mockPost.mockResolvedValueOnce({ ok: true });

        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);

        const deleteButton = screen.getByText('削除');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/csrf');
        });

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalled();
        });
    });

    it('削除成功時にonCloseを呼び出し', async () => {
        mockPost.mockResolvedValueOnce({ ok: true });

        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);

        const deleteButton = screen.getByText('削除');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    it('削除成功時にmyBookmarkから削除', async () => {
        mockPost.mockResolvedValueOnce({ ok: true });

        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);

        const deleteButton = screen.getByText('削除');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockSetMyBookmark).toHaveBeenCalled();
        });
    });

    it('削除成功時にisNeedReloadをtrueに設定', async () => {
        mockPost.mockResolvedValueOnce({ ok: true });

        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);

        const deleteButton = screen.getByText('削除');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockSetIsNeedReload).toHaveBeenCalledWith(true);
        });
    });

    it('API失敗時にエラー通知を表示', async () => {
        mockPost.mockResolvedValueOnce({ ok: false });

        render(<DeleteBookmark aturi="at://did:plc:xxx/blue.rito.feed.bookmark/yyy" onClose={mockOnClose} />);

        const deleteButton = screen.getByText('削除');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            expect(mockPost).toHaveBeenCalled();
        });
    });

    it('aturiがundefinedの場合は削除処理をスキップ', async () => {
        render(<DeleteBookmark aturi={undefined} onClose={mockOnClose} />);

        const deleteButton = screen.getByText('削除');
        fireEvent.click(deleteButton);

        // タイマーを進める
        vi.runAllTimers();

        expect(global.fetch).not.toHaveBeenCalled();
    });
});
