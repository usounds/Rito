import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../../../../src/test-utils';
import { BlueskyTabLabel } from '../BlueskyTabLabel';

describe('BlueskyTabLabel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('初期表示は (-) を表示する', () => {
        // fetchが完了する前の状態
        (global.fetch as any).mockImplementationOnce(() => new Promise(() => { }));

        render(<BlueskyTabLabel subjectUrl="https://example.com" />);
        expect(screen.getByText(/detail.bluesky\s*\(\s*-\s*\)/)).toBeInTheDocument();
    });

    it('APIから取得した件数を表示する', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ total: 42 })
        });

        render(<BlueskyTabLabel subjectUrl="https://example.com" />);

        await waitFor(() => {
            expect(screen.getByText(/detail.bluesky\s*\(\s*42\s*\)/)).toBeInTheDocument();
        });
    });

    it('APIエラー時は (0) を表示する', async () => {
        (global.fetch as any).mockResolvedValueOnce({
            ok: false
        });

        render(<BlueskyTabLabel subjectUrl="https://example.com" />);

        await waitFor(() => {
            expect(screen.getByText(/detail.bluesky\s*\(\s*0\s*\)/)).toBeInTheDocument();
        });
    });

    it('フェッチ中に例外が発生した場合は (0) を表示する', async () => {
        (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

        render(<BlueskyTabLabel subjectUrl="https://example.com" />);

        await waitFor(() => {
            expect(screen.getByText(/detail.bluesky\s*\(\s*0\s*\)/)).toBeInTheDocument();
        });
    });
});
