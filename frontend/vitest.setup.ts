import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
    useLocale: () => 'ja',
    useMessages: () => ({
        title: 'Rito',
        create: { inform: { bookmark: 'ブックマークしました', success: '成功', process: '処理中' }, error: { unknownError: 'エラー' } },
        detail: { view: '表示', more: 'もっと見る', less: '閉じる', inform: { process: '処理中', needlogin: 'ログインが必要です', nomore: 'これ以上ありません' } },
        delete: { title: '削除', description: '削除しますか？', button: { close: '閉じる', delete: '削除' }, inform: { success: '削除しました', error: 'エラー' }, error: { error: 'エラー' } },
        login: { title: 'ログイン', titleDescription: 'ログイン', didresolve: 'DID解決中', redirect: 'リダイレクト中', create: 'アカウント作成', button: { login: 'ログイン' }, field: { handle: { title: 'ハンドル', placeholder: 'example.bsky.social' }, agree: { title: '同意する' } }, error: { whitespace: '空白不可', notdomain: 'ドメイン形式', multibyte: 'ASCII文字のみ', invalidhandle: '無効なハンドル' } },
        header: { termofuse: '利用規約', privacypolicy: 'プライバシー' },
    }),
    useTranslations: () => (key: string) => key,
}));

// Mock fetch
global.fetch = vi.fn();

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock ResizeObserver
global.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
};

// Mock IntersectionObserver
global.IntersectionObserver = class {
    root = null;
    rootMargin = '';
    thresholds = [];
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn();
};
