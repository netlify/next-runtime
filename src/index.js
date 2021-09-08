// @ts-check
const path = require("path");

const { copyFile, ensureDir, writeFile } = require("fs-extra");

const DEFAULT_FUNCTIONS_SRC = "netlify/functions";
const copyNextDist = require("./copyNextDist");
const getHandler = require("./getHandler");
const getNextRoot = require("./getNextRoot");
const writeRedirects = require("./writeRedirects");

const HANDLER_FUNCTION_NAME = "___netlify-handler";
const ODB_FUNCTION_NAME = "___netlify-odb-handler";

module.exports = {
  async onPreBuild({ netlifyConfig }) {
    // This could technically be done in onBuild, too
    [HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME].forEach((functionName) => {
      if (!netlifyConfig.functions[functionName]) {
        netlifyConfig.functions[functionName] = {};
      }
      if (!netlifyConfig.functions[functionName].included_files) {
        netlifyConfig.functions[functionName].included_files = [];
      }
      // TO-DO: get distDir from next.config.js
      netlifyConfig.functions[functionName].included_files.push(`.next/server/**`, `.next/*.json`, `.next/BUILD_ID`);
    });

    console.log({ netlifyConfig });
  },

  async onBuild({
    netlifyConfig,
    constants: { PUBLISH_DIR, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC, INTERNAL_FUNCTIONS_SRC },
  }) {
    const FUNCTION_DIR = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC;
    const bridgeFile = require.resolve("@vercel/node/dist/bridge");

    const writeHandler = async (func, isODB) => {
      const handlerSource = await getHandler(isODB);
      await ensureDir(path.join(FUNCTION_DIR, func));
      await writeFile(path.join(FUNCTION_DIR, func, `${func}.js`), handlerSource);
      await copyFile(bridgeFile, path.join(FUNCTION_DIR, func, "bridge.js"));
    };

    await writeHandler(HANDLER_FUNCTION_NAME, false);
    await writeHandler(ODB_FUNCTION_NAME, true);

    await writeRedirects({
      publishDir: PUBLISH_DIR,
      nextRoot: path.dirname(PUBLISH_DIR),
      netlifyConfig,
    });

    const siteRoot = getNextRoot({ netlifyConfig });
    if (siteRoot !== process.cwd()) {
      copyNextDist(siteRoot);
    }
  },
};
