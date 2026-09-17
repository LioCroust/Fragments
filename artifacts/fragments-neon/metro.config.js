const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existingEnhanceMiddleware = config.server?.enhanceMiddleware;

// Metro emits a malformed Content-Location for proxied bundle URLs:
// `entry.bundle//&platform=...`. Expo Go can follow that header instead of
// the valid launchAsset.url and receives the web fallback HTML. The header is
// optional for Expo dev bundles, so omit it while preserving all other Metro
// response headers and middleware behavior.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const enhancedMiddleware = existingEnhanceMiddleware
      ? existingEnhanceMiddleware(middleware, server)
      : middleware;

    return (request, response, next) => {
      const originalSetHeader = response.setHeader;
      response.setHeader = function setHeaderWithoutContentLocation(name, value) {
        if (String(name).toLowerCase() === 'content-location') {
          return this;
        }
        return originalSetHeader.call(this, name, value);
      };
      return enhancedMiddleware(request, response, next);
    };
  },
};

module.exports = config;
