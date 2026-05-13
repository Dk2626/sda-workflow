/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['better-sqlite3'] },
  reactStrictMode: true,
};
module.exports = nextConfig;
