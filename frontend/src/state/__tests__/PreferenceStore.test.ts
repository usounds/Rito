import { describe, it, expect, beforeEach } from 'vitest';
import { usePreferenceStore } from '../PreferenceStore';

describe('Store: PreferenceStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        usePreferenceStore.setState({
            isDeveloper: false,
        });
    });

    it('初期状態が正しい', () => {
        const state = usePreferenceStore.getState();
        expect(state.isDeveloper).toBe(false);
    });

    it('setIsDeveloperでデベロッパーモードを有効化', () => {
        usePreferenceStore.getState().setIsDeveloper(true);
        expect(usePreferenceStore.getState().isDeveloper).toBe(true);
    });

    it('setIsDeveloperでデベロッパーモードを無効化', () => {
        usePreferenceStore.getState().setIsDeveloper(true);
        usePreferenceStore.getState().setIsDeveloper(false);
        expect(usePreferenceStore.getState().isDeveloper).toBe(false);
    });

    it('状態のトグルが正しく動作', () => {
        const toggle = () => {
            const current = usePreferenceStore.getState().isDeveloper;
            usePreferenceStore.getState().setIsDeveloper(!current);
        };

        expect(usePreferenceStore.getState().isDeveloper).toBe(false);
        toggle();
        expect(usePreferenceStore.getState().isDeveloper).toBe(true);
        toggle();
        expect(usePreferenceStore.getState().isDeveloper).toBe(false);
    });
});
