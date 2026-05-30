import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import {
  getBaseUrl,
  publicAssetAllowPaths,
  publicPagePaths,
} from '@/seo/publicPages';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const allowedPages = routing.locales.flatMap((locale) =>
    publicPagePaths.map((path) => `/${locale}${path}$`)
  );

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/robots.txt',
        '/sitemap.xml',
        ...publicAssetAllowPaths,
        ...allowedPages,
      ],
      disallow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
