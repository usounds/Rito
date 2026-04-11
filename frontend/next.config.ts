import { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['dev.rito.blue'],
  output: 'standalone', // ← これを追加

  serverExternalPackages: ['@atcute/time-ms', '@atcute/tid', '@atcute/util-text', '@atcute/client', '@atcute/lexicons'],

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
    return [];
  },
};

export default withNextIntl(nextConfig);
