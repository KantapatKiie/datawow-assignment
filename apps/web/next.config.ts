import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produces a self-contained server bundle so the Docker image stays small.
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd() + '/../..',
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
