import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_IS_READONLY: process.env.VERCEL ? 'true' : 'false',
  },
  outputFileTracingIncludes: {
    '/api/**/*': ['./hope.db'],
    '/**/*': ['./hope.db'],
  },
  experimental: {
    cpus: 1,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      },
      {
        source: '/forgot-password',
        destination: '/reset-password',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
