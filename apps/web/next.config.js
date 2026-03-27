/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@cveriskpilot/domain',
    '@cveriskpilot/shared',
    '@cveriskpilot/auth',
  ],
};

export default nextConfig;
