"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const constants_1 = require("./constants");
const cache_1 = require("./helpers/cache");
const config_1 = require("./helpers/config");
const files_1 = require("./helpers/files");
const functions_1 = require("./helpers/functions");
const redirects_1 = require("./helpers/redirects");
const utils_1 = require("./helpers/utils");
const verification_1 = require("./helpers/verification");
const plugin = {
    async onPreBuild({ constants, netlifyConfig, utils: { build: { failBuild }, cache, }, }) {
        var _a;
        const { publish } = netlifyConfig.build;
        if ((0, utils_1.shouldSkip)()) {
            await (0, cache_1.restoreCache)({ cache, publish });
            console.log('Not running Essential Next.js plugin');
            if ((0, fs_extra_1.existsSync)((0, path_1.join)(constants.INTERNAL_FUNCTIONS_SRC, constants_1.HANDLER_FUNCTION_NAME))) {
                console.log(`Please ensure you remove any generated functions from ${constants.INTERNAL_FUNCTIONS_SRC}`);
            }
            return;
        }
        (0, verification_1.checkForRootPublish)({ publish, failBuild });
        (0, verification_1.verifyNetlifyBuildVersion)({ failBuild, ...constants });
        await (0, cache_1.restoreCache)({ cache, publish });
        (_a = netlifyConfig.build).environment || (_a.environment = {});
        // eslint-disable-next-line unicorn/consistent-destructuring
        netlifyConfig.build.environment.NEXT_PRIVATE_TARGET = 'server';
    },
    async onBuild({ constants, netlifyConfig, utils: { build: { failBuild }, }, }) {
        if ((0, utils_1.shouldSkip)()) {
            return;
        }
        const { publish } = netlifyConfig.build;
        (0, verification_1.checkNextSiteHasBuilt)({ publish, failBuild });
        const { appDir, basePath, i18n, images, target, ignore, trailingSlash, outdir } = await (0, config_1.getNextConfig)({
            publish,
            failBuild,
        });
        const buildId = (0, fs_extra_1.readFileSync)((0, path_1.join)(publish, 'BUILD_ID'), 'utf8').trim();
        (0, config_1.configureHandlerFunctions)({ netlifyConfig, ignore, publish: (0, path_1.relative)(process.cwd(), publish) });
        await (0, functions_1.generateFunctions)(constants, appDir);
        await (0, functions_1.generatePagesResolver)({ target, constants });
        await (0, files_1.movePublicFiles)({ appDir, outdir, publish });
        await (0, files_1.patchNextFiles)(basePath);
        if (process.env.EXPERIMENTAL_MOVE_STATIC_PAGES) {
            console.log("The flag 'EXPERIMENTAL_MOVE_STATIC_PAGES' is no longer required, as it is now the default. To disable this behavior, set the env var 'SERVE_STATIC_FILES_FROM_ORIGIN' to 'true'");
        }
        if (!process.env.SERVE_STATIC_FILES_FROM_ORIGIN) {
            await (0, files_1.moveStaticPages)({ target, netlifyConfig, i18n });
        }
        await (0, redirects_1.generateStaticRedirects)({
            netlifyConfig,
            nextConfig: { basePath, i18n },
        });
        await (0, functions_1.setupImageFunction)({ constants, imageconfig: images, netlifyConfig, basePath });
        await (0, redirects_1.generateRedirects)({
            netlifyConfig,
            nextConfig: { basePath, i18n, trailingSlash, appDir },
            buildId,
        });
    },
    async onPostBuild({ netlifyConfig: { build: { publish }, redirects, }, utils: { status, cache, functions, build: { failBuild }, }, constants: { FUNCTIONS_DIST }, }) {
        await (0, cache_1.saveCache)({ cache, publish });
        if ((0, utils_1.shouldSkip)()) {
            status.show({
                title: 'Essential Next.js plugin did not run',
                summary: `Next cache was stored, but all other functions were skipped because ${process.env.NETLIFY_NEXT_PLUGIN_SKIP
                    ? `NETLIFY_NEXT_PLUGIN_SKIP is set`
                    : `NEXT_PLUGIN_FORCE_RUN is set to ${process.env.NEXT_PLUGIN_FORCE_RUN}`}`,
            });
            return;
        }
        await (0, verification_1.checkForOldFunctions)({ functions });
        await (0, verification_1.checkZipSize)((0, path_1.join)(FUNCTIONS_DIST, `${constants_1.ODB_FUNCTION_NAME}.zip`));
        const { basePath, appDir } = await (0, config_1.getNextConfig)({ publish, failBuild });
        (0, verification_1.warnForProblematicUserRewrites)({ basePath, redirects });
        (0, verification_1.warnForRootRedirects)({ appDir });
        await (0, files_1.unpatchNextFiles)(basePath);
    },
};
module.exports = plugin;
