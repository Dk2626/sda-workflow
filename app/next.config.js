/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['node-sqlite3-wasm'] },
  reactStrictMode: true,
};
module.exports = nextConfig;
