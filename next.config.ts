import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No basePath/assetPrefix needed - served at root via nginx
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'game-assets.swgoh.gg',
        pathname: '/textures/**',
      },
    ],
  },
};

export default nextConfig;
