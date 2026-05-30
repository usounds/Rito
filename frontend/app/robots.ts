import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

const sitemapPaths = [
  '',
  '/about',
  '/privacy',
  '/tos',
  '/status',
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rito.blue';
  const allowedPages = routing.locales.flatMap((locale) =>
    sitemapPaths.map((path) => `/${locale}${path}$`)
  );

  return {
    rules: {
      userAgent: '*',
      allow: [
        '/robots.txt',
        '/sitemap.xml',
        ...allowedPages,
      ],
      disallow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
