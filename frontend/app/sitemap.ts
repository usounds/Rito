import { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://rito.blue';

  const paths = [
    '',
    '/about',
    '/privacy',
    '/tos',
    '/status',
  ];

  return paths.flatMap((path) => {
    return routing.locales.map((locale) => {
      const alternates: Record<string, string> = {};
      routing.locales.forEach((loc) => {
        alternates[loc] = `${baseUrl}/${loc}${path}`;
      });

      return {
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: path === '' ? 1.0 : 0.8,
        alternates: {
          languages: alternates,
        },
      };
    });
  });
}
