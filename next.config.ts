import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    '/api/**/*': ['./hope.db', './auth.db'],
    '/**/*': ['./hope.db', './auth.db'],
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
    ];
  },
};

export default nextConfig;
