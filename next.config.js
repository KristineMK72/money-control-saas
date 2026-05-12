const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fresh build output on Vercel so static assets are not stuck on a stale cache id.
  generateBuildId: async () =>
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    `local-${Date.now()}`,

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname),
    };
    return config;
  },
};

module.exports = nextConfig;
