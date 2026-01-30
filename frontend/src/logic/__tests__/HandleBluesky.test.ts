import { describe, it, expect, vi } from 'vitest';

// Mock tinyld
vi.mock('tinyld', () => ({
    detectAll: vi.fn((text: string) => {
        if (text.includes('こんにちは')) {
            return [{ lang: 'ja', accuracy: 0.9 }, { lang: 'en', accuracy: 0.1 }];
        }
        if (text.includes('Hello')) {
            return [{ lang: 'en', accuracy: 0.95 }];
        }
        return [];
    }),
}));

// Mock RichtextBuilder
vi.mock('@atcute/bluesky-richtext-builder', () => ({
    default: class RichtextBuilder {
        text = '';
        facets: unknown[] = [];
        addText(t: string) { this.text += t; return this; }
        addTag(tag: string) { this.text += `#${tag}`; this.facets.push({ tag }); return this; }
        addLink(text: string, href: string) { this.text += text; this.facets.push({ link: href }); return this; }
    },
}));

import { detectTopLanguages, buildPost } from '../HandleBluesky';

describe('HandleBluesky', () => {
    describe('detectTopLanguages', () => {
        it('日本語テキストは言語コードを返す', () => {
            const result = detectTopLanguages('こんにちは世界');
            expect(result).toContain('ja');
        });

        it('英語テキストは言語コードを返す', () => {
            const result = detectTopLanguages('Hello World');
            expect(result).toContain('en');
        });

        it('空テキストは空配列を返す', () => {
            const result = detectTopLanguages('');
            expect(result).toEqual([]);
        });

        it('最大2件の言語を返す', () => {
            const result = detectTopLanguages('こんにちは');
            expect(result.length).toBeLessThanOrEqual(2);
        });
    });

    describe('buildPost', () => {
        const mockMessages = {
            create: { inform: { bookmark: 'ブックマークしました' } },
            title: 'Rito',
        } as any;

        it('投稿オブジェクトを生成する', () => {
            const result = buildPost('テストコメント', ['tag1'], mockMessages);
            expect(result.$type).toBe('app.bsky.feed.post');
            expect(result.text).toContain('テストコメント');
            expect(result.createdAt).toBeDefined();
        });

        it('rito.blueタグが自動追加される', () => {
            const result = buildPost('コメント', ['test'], mockMessages);
            expect(result.text).toContain('rito.blue');
        });

        it('既にrito.blueがあれば重複追加しない', () => {
            const result = buildPost('コメント', ['rito.blue', 'test'], mockMessages);
            const matches = result.text.match(/rito\.blue/g);
            expect(matches?.length).toBe(1);
        });

        it('空コメント時はデフォルトテキストを使用', () => {
            const result = buildPost(undefined, [], mockMessages);
            expect(result.text).toContain('ブックマークしました');
        });

        it('ホワイトスペースを含むタグは除外', () => {
            const result = buildPost('test', ['valid', 'in valid', 'also valid'], mockMessages);
            expect(result.text).not.toContain('in valid');
        });

        it('ritoUrlが指定された場合、参照リンクを追加する', () => {
            const mockMessagesWithLink = {
                ...mockMessages,
                create: { inform: { bookmark: 'ブックマーク', referInRito: 'Ritoで見る' } }
            };
            const result = buildPost('test', [], mockMessagesWithLink as any, 'https://rito.blue/post/123');

            // テキストにリンク文言が含まれるか
            expect(result.text).toContain('Ritoで見る');
            // ファセットが含まれるか (mockの実装に依存)
            expect(result.facets).toEqual(expect.arrayContaining([{ link: 'https://rito.blue/post/123' }]));
        });
    });
});
