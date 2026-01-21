import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import { render } from '../../test-utils';
import TimeAgo from '../TimeAgo';

describe('TimeAgo', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('秒単位の時間を表示', async () => {
        const date = new Date('2024-01-15T11:59:30Z'); // 30秒前
        render(<TimeAgo date={date} locale="ja" />);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(screen.getByText(/秒|second/i)).toBeInTheDocument();
    });

    it('分単位の時間を表示', async () => {
        const date = new Date('2024-01-15T11:55:00Z'); // 5分前
        render(<TimeAgo date={date} locale="ja" />);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(screen.getByText(/分|minute/i)).toBeInTheDocument();
    });

    it('時間単位の時間を表示', async () => {
        const date = new Date('2024-01-15T09:00:00Z'); // 3時間前
        render(<TimeAgo date={date} locale="ja" />);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(screen.getByText(/時間|hour/i)).toBeInTheDocument();
    });

    it('日単位の時間を表示', async () => {
        const date = new Date('2024-01-13T12:00:00Z'); // 2日前
        render(<TimeAgo date={date} locale="ja" />);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(screen.getByText(/日|day/i)).toBeInTheDocument();
    });

    it('文字列形式の日付を処理', async () => {
        render(<TimeAgo date="2024-01-15T11:55:00Z" locale="ja" />);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(screen.getByText(/分|minute/i)).toBeInTheDocument();
    });

    it('英語ロケールで表示', async () => {
        const date = new Date('2024-01-15T11:55:00Z');
        render(<TimeAgo date={date} locale="en" />);

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(screen.getByText(/minute/i)).toBeInTheDocument();
    });
});
