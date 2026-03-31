import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Use separate dist dir in dev to avoid root-owned .next permission conflicts
  ...(process.env.NODE_ENV !== 'production' && { distDir: '.next-dev' }),
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
  },
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  /* ---------------------------------------------------------------- */
  /*  Security + caching headers                                      */
  /* ---------------------------------------------------------------- */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/graphics/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/icon-192.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/api',
        destination: '/api-key',
        permanent: false,
      },
    ];
  },

  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'nodemailer', 'ioredis'],
  transpilePackages: [
    '@cveriskpilot/domain',
    '@cveriskpilot/shared',
    '@cveriskpilot/auth',
    '@cveriskpilot/ai',
    '@cveriskpilot/billing',
    '@cveriskpilot/enrichment',
    '@cveriskpilot/parsers',
    '@cveriskpilot/storage',
    '@cveriskpilot/integrations',
    '@cveriskpilot/notifications',
    '@cveriskpilot/compliance',
    '@cveriskpilot/connectors',
    '@cveriskpilot/scan',
    '@cveriskpilot/stamps',
    '@cveriskpilot/streaming',
    '@cveriskpilot/db-scale',
    '@cveriskpilot/rollout',
    '@cveriskpilot/residency',
    '@cveriskpilot/backup',
    '@cveriskpilot/abac',
    '@cveriskpilot/observability',
    '@cveriskpilot/whitelabel',
    '@cveriskpilot/api-docs',
  ],
};

export default nextConfig;
