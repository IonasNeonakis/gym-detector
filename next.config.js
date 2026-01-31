const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // next-pwa requires webpack for manifest and service worker generation.
  // We explicitly use webpack in the build script to ensure compatibility.
  webpack: (config) => {
    return config;
  },
};

module.exports = withPWA(nextConfig);
