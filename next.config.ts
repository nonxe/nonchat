import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.catbox.moe' },
      { protocol: 'https', hostname: '**.davidcyril.name.ng' },
      { protocol: 'https', hostname: 'files.catbox.moe' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
  // Allow large uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '16mb',
    },
  },
};

export default nextConfig;
