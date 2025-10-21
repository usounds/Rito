import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // すでに言語付きのパスならそのまま
  if (routing.locales.some((locale) => pathname.startsWith(`/${locale}`))) {
    return;
  }

  // ブラウザの言語を判定
  const acceptLanguage = req.headers.get('accept-language') || '';
  const preferred = acceptLanguage.split(',')[0].split('-')[0]; // ex: "ja" or "en"
  const locale = (routing.locales.find(l => l === preferred) ?? routing.defaultLocale) as "en" | "ja";

  // ルートにリダイレクト
  const url = req.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // 言語プレフィックスを自動付与する対象のパス
    '/((?!api|xrpc|.well-known|trpc|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.svg|callback).*)',
  ],
};