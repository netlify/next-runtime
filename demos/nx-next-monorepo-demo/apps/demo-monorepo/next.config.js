// eslint-disable-next-line @typescript-eslint/no-var-requires
const withNx = require('@nrwl/next/plugins/with-nx');
const { InjectManifest } = require("workbox-webpack-plugin");

/**
 * @type {import('@nrwl/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {
    // Set this to true if you would like to to use SVGR
    // See: https://github.com/gregberge/svgr
    svgr: false,
  },
  webpack(config, options) {
    if (!options.dev) {
      const serviceWorkerPlugin = new InjectManifest({
        swSrc: "./src/service-worker.ts",
        swDest: "../public/service-worker.js",
      });
      config.plugins.push(serviceWorkerPlugin);
    }
    return config;
  },
};

module.exports = withNx(nextConfig);
