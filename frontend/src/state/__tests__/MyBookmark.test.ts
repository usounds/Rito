import { describe, it, expect, beforeEach } from 'vitest';
import { useMyBookmark } from '../MyBookmark';

describe('Store: MyBookmark', () => {
    beforeEach(() => {
        // Reset store state before each test
        useMyBookmark.setState({
            myBookmark: [],
            tagRanking: [],
            isNeedReload: false,
        });
    });

    it('初期状態が正しい', () => {
        const state = useMyBookmark.getState();
        expect(state.myBookmark).toEqual([]);
        expect(state.tagRanking).toEqual([]);
        expect(state.isNeedReload).toBe(false);
    });

    it('setMyBookmarkでブックマークを設定', () => {
        const bookmarks = [
            { uri: 'at://did:plc:xxx/blue.rito.feed.bookmark/1', subject: 'https://example.com' },
        ];
        useMyBookmark.getState().setMyBookmark(bookmarks as never);

        expect(useMyBookmark.getState().myBookmark).toEqual(bookmarks);
    });

    it('setIsNeedReloadでリロードフラグを設定', () => {
        useMyBookmark.getState().setIsNeedReload(true);
        expect(useMyBookmark.getState().isNeedReload).toBe(true);

        useMyBookmark.getState().setIsNeedReload(false);
        expect(useMyBookmark.getState().isNeedReload).toBe(false);
    });

    it('setTagRankingでタグランキングを設定', () => {
        const ranking = [{ tag: 'test', count: 10 }];
        useMyBookmark.getState().setTagRanking(ranking as never);

        expect(useMyBookmark.getState().tagRanking).toEqual(ranking);
    });

    it('複数回の更新が正しく動作', () => {
        const bookmark1 = [{ uri: '1' }];
        const bookmark2 = [{ uri: '2' }];

        useMyBookmark.getState().setMyBookmark(bookmark1 as never);
        expect(useMyBookmark.getState().myBookmark).toEqual(bookmark1);

        useMyBookmark.getState().setMyBookmark(bookmark2 as never);
        expect(useMyBookmark.getState().myBookmark).toEqual(bookmark2);
    });
});
