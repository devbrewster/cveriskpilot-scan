/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'nodemailer'],
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
