import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import {
  getBaseUrl,
  getPublicPageLanguages,
  getPublicPageUrl,
  publicPagePaths,
} from '@/seo/publicPages';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  return publicPagePaths.flatMap((path) => {
    return routing.locales.map((locale) => {
      return {
        url: getPublicPageUrl(locale, path, baseUrl),
        changeFrequency: 'daily' as const,
        priority: path === '' ? 1.0 : 0.8,
        alternates: {
          languages: getPublicPageLanguages(path, baseUrl),
        },
      };
    });
  });
}
