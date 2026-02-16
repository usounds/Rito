import { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone', // ← これを追加

  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    minimumCacheTTL: 86400, // 24時間
  },

  async redirects() {
    return [
      {
        source: '/:locale/bookmark/discover',
        destination: '/:locale',
        permanent: true,
      },
    ];
  },

  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/_next/static/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "no-store, max-age=0",
            },
          ],
        },
      ];
    }

    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, s-maxage=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/data/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public,max-age=0,must-revalidate",
          },
        ],
      },
      {
        // 画像最適化用のエンドポイントに対するキャッシュ設定
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            // CDNにキャッシュさせる（24時間キャッシュ、再検証中も60秒は古いものを返す）
            value: "public, max-age=86400, stale-while-revalidate=60",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
