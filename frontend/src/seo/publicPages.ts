import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const publicPagePaths = [
  '',
  '/about',
  '/privacy',
  '/tos',
  '/status',
] as const;

export const publicAssetAllowPaths = [
  '/_next/static/',
  '/_next/image',
  '/favicon.ico',
  '/rito_ogp.png',
] as const;

export type PublicPagePath = (typeof publicPagePaths)[number];

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_URL || 'https://rito.blue';
}

export function getPublicPageUrl(locale: string, path: PublicPagePath, baseUrl = getBaseUrl()) {
  return `${baseUrl}/${locale}${path}`;
}

export function getPublicPageLanguages(path: PublicPagePath, baseUrl = getBaseUrl()) {
  const languages: Record<string, string> = {};

  routing.locales.forEach((locale) => {
    languages[locale] = getPublicPageUrl(locale, path, baseUrl);
  });
  languages['x-default'] = getPublicPageUrl(routing.defaultLocale, path, baseUrl);

  return languages;
}

export function getPublicPageAlternates(locale: string, path: PublicPagePath): Metadata['alternates'] {
  const baseUrl = getBaseUrl();

  return {
    canonical: getPublicPageUrl(locale, path, baseUrl),
    languages: getPublicPageLanguages(path, baseUrl),
  };
}

export function getDefaultOgImage(baseUrl = getBaseUrl()) {
  return {
    url: `${baseUrl}/rito_ogp.png`,
    width: 1200,
    height: 630,
  };
}
