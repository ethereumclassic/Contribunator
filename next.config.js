const nextConfig = {
  // the Blob SDK calls "<api>/?pathname=": in tests the API is the mock in
  // /api/e2e/blob, which must not be redirected (it would drop upload bodies)
  skipTrailingSlashRedirect: process.env.NODE_ENV === "test",
  experimental: {
    appDir: true,
    typedRoutes: true,
    // loaded at runtime: webpack 5 in Next 13.4 can't parse undici's syntax
    serverComponentsExternalPackages: ["@vercel/blob", "undici"],
  },
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
  webpack(config, { isServer }) {
    // @vercel/blob's undici: required at runtime on the server (webpack in
    // Next 13.4 can't parse it); browsers get the package's own stub
    if (isServer) {
      config.externals = [...[].concat(config.externals || []), "undici"];
    }
    return config;
  },
  env: {
    userTestConfig: require("fs").existsSync(
      "contributions/test/configs/test.config.ts"
    ),
  },
};

function getConfig() {
  if (process.env.ANALYZE === "true") {
    return require("@next/bundle-analyzer")({ enabled: true })(nextConfig);
  }
  if (process.env.LOGTAIL_SOURCE_TOKEN) {
    return require("@logtail/next").withLogtail(nextConfig);
  }
  return nextConfig;
}

module.exports = getConfig();
