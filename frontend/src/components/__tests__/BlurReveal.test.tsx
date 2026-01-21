import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test-utils';
import { BlurReveal } from '../BlurReveal';

describe('BlurReveal', () => {
    it('モデレーションなしの場合はぼかしなしで表示', () => {
        render(
            <BlurReveal moderated={false} blurAmount={6} overlayText="表示">
                <div data-testid="content">コンテンツ</div>
            </BlurReveal>
        );
        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('モデレーションありの場合はオーバーレイテキストを表示', () => {
        render(
            <BlurReveal moderated={true} blurAmount={6} overlayText="クリックして表示">
                <div data-testid="content">センシティブなコンテンツ</div>
            </BlurReveal>
        );
        expect(screen.getByText('クリックして表示')).toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('クリックでぼかしを解除', () => {
        render(
            <BlurReveal moderated={true} blurAmount={6} overlayText="表示">
                <div data-testid="content">コンテンツ</div>
            </BlurReveal>
        );

        const overlay = screen.getByText('表示');
        fireEvent.click(overlay);

        // クリック後はオーバーレイが消える
        expect(screen.queryByText('表示')).not.toBeInTheDocument();
        expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('複数の子要素を正しくレンダリング', () => {
        render(
            <BlurReveal moderated={false} blurAmount={6} overlayText="">
                <span data-testid="child1">子コンテンツ1</span>
                <span data-testid="child2">子コンテンツ2</span>
            </BlurReveal>
        );
        expect(screen.getByTestId('child1')).toBeInTheDocument();
        expect(screen.getByTestId('child2')).toBeInTheDocument();
    });
});
