import { AtPassport } from "@atpassport/client";

/**
 * AtPassport のインスタンスを取得するヘルパー関数
 * 環境変数 NEXT_PUBLIC_URL を使用して origin を自動決定
 */
export function getAtPassport(options?: {
  lang?: 'ja' | 'en';
}) {
  const { lang = 'ja' } = options || {};
  // NEXT_PUBLIC_URL があればそれを使用、なければブラウザ環境からの取得を試みる
  const origin = process.env.NEXT_PUBLIC_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const isDev = process.env.NODE_ENV === 'development' ||
    (typeof window !== 'undefined' && (window.location.hostname === 'dev.rito.blue' || window.location.hostname === 'localhost' || window.location.hostname.endsWith('.localhost')));

  const baseUrl = isDev
    ? 'https://dev.atpassport.net'
    : 'https://atpassport.net';

  return new AtPassport({
    baseUrl,
    callbackUrl: `${origin}/api/atpassport/callback`,
    lang,
    fedcm: true,
    requiredParams: {
      returnTo: 'string'
    }
  });
}
