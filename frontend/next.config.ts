import { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone', // ← これを追加

  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
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
    ];
  },
};

export default withNextIntl(nextConfig);
