import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

// next-intl のプラグイン初期化
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks"],
  },
};

// next-intl プラグインを適用
export default withNextIntl(nextConfig);
