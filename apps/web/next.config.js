import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  env: {
    NEXT_PUBLIC_APP_VERSION: rootPkg.version,
  },
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
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
