import { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

import path from 'path';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['dev.rito.blue'],
  output: 'standalone', // ← これを追加
  productionBrowserSourceMaps: true, // ソースマップを有効化

  serverExternalPackages: ['@atcute/time-ms', '@atcute/tid', '@atcute/util-text', '@atcute/client', '@atcute/lexicons'],

  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "lucide-react"],
    cpus: 1,
  },

  turbopack: {
    root: path.resolve('..'),
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
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 480, 512],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      if (config.optimization?.splitChunks?.cacheGroups) {
        config.optimization.splitChunks.cacheGroups.mantineCommon = {
          test: /[\\/]node_modules[\\/](@mantine|lucide-react)[\\/]/,
          name: 'mantine-common',
          chunks: 'all',
          priority: 40,
          enforce: true,
        };
      }
    }
    return config;
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
