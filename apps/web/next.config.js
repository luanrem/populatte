/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@populatte/types', '@populatte/commons'],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
