const { join } = require("path");

const { copySync, existsSync } = require("fs-extra");

const copyNextDist = (siteRoot) => {
  // TO-DO: get distDir from next.config.js
  const distPath = join(siteRoot, ".next");
  if (!existsSync(distPath)) {
    throw new Error(`No dist found in ${distPath}`);
  }
  copySync(distPath, join(".", ".next"), {
    overwrite: true,
  });
};

module.exports = copyNextDist;
