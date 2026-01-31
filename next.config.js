const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // next-pwa uses webpack, so we need to ensure it works with Turbopack enabled by default in Next 15+
  // or explicitly use webpack for build.
  webpack: (config) => {
    return config;
  }
};

module.exports = withPWA(nextConfig);
