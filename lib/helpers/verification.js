"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnForRootRedirects = exports.warnForProblematicUserRewrites = exports.getProblematicUserRewrites = exports.checkZipSize = exports.checkForRootPublish = exports.checkNextSiteHasBuilt = exports.checkForOldFunctions = exports.verifyNetlifyBuildVersion = void 0;
/* eslint-disable max-lines */
const fs_1 = require("fs");
const path_1 = __importStar(require("path"));
const chalk_1 = require("chalk");
const node_stream_zip_1 = require("node-stream-zip");
const outdent_1 = require("outdent");
const pretty_bytes_1 = __importDefault(require("pretty-bytes"));
const semver_1 = require("semver");
const constants_1 = require("../constants");
// This is when nft support was added
const REQUIRED_BUILD_VERSION = '>=18.16.0';
const verifyNetlifyBuildVersion = ({ IS_LOCAL, NETLIFY_BUILD_VERSION, failBuild, }) => {
    // We check for build version because that's what's available to us, but prompt about the cli because that's what they can upgrade
    if (IS_LOCAL && !(0, semver_1.satisfies)(NETLIFY_BUILD_VERSION, REQUIRED_BUILD_VERSION, { includePrerelease: true })) {
        return failBuild((0, outdent_1.outdent) `
      This version of the Essential Next.js plugin requires netlify-cli@6.12.4 or higher. Please upgrade and try again.
      You can do this by running: "npm install -g netlify-cli@latest" or "yarn global add netlify-cli@latest"
    `);
    }
};
exports.verifyNetlifyBuildVersion = verifyNetlifyBuildVersion;
const checkForOldFunctions = async ({ functions }) => {
    const allOldFunctions = await functions.list();
    const oldFunctions = allOldFunctions.filter(({ name }) => name.startsWith('next_'));
    if (oldFunctions.length !== 0) {
        console.log((0, chalk_1.yellowBright)((0, outdent_1.outdent) `
        We have found the following functions in your site that seem to be left over from the old Next.js plugin (v3). We have guessed this because the name starts with "next_".

        ${(0, chalk_1.reset)(oldFunctions.map(({ name }) => `- ${name}`).join('\n'))}

        If they were created by the old plugin, these functions are likely to cause errors so should be removed. You can do this by deleting the following directories:

        ${(0, chalk_1.reset)(oldFunctions.map(({ mainFile }) => `- ${path_1.default.relative(process.cwd(), path_1.default.dirname(mainFile))}`).join('\n'))}
      `));
    }
};
exports.checkForOldFunctions = checkForOldFunctions;
const checkNextSiteHasBuilt = ({ publish, failBuild, }) => {
    if (!(0, fs_1.existsSync)(path_1.default.join(publish, 'BUILD_ID'))) {
        const outWarning = path_1.default.basename(publish) === 'out'
            ? `Your publish directory is set to "out", but in most cases it should be ".next".`
            : `In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config.`;
        return failBuild((0, outdent_1.outdent) `
      The directory "${path_1.default.relative(process.cwd(), publish)}" does not contain a Next.js production build. Perhaps the build command was not run, or you specified the wrong publish directory.
      ${outWarning}
      If you are using "next export" then you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
    `);
    }
    if ((0, fs_1.existsSync)(path_1.default.join(publish, 'export-detail.json'))) {
        failBuild((0, outdent_1.outdent) `
      Detected that "next export" was run, but site is incorrectly publishing the ".next" directory.
      The publish directory should be set to "out", and you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
    `);
    }
};
exports.checkNextSiteHasBuilt = checkNextSiteHasBuilt;
const checkForRootPublish = ({ publish, failBuild, }) => {
    if (path_1.default.resolve(publish) === path_1.default.resolve('.')) {
        failBuild((0, outdent_1.outdent) `
      Your publish directory is pointing to the base directory of your site. This is not supported for Next.js sites, and is probably a mistake. 
      In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config, or the Next site is in a subdirectory.
    `);
    }
};
exports.checkForRootPublish = checkForRootPublish;
const checkZipSize = async (file, maxSize = constants_1.LAMBDA_MAX_SIZE) => {
    if (!(0, fs_1.existsSync)(file)) {
        console.warn(`Could not check zip size because ${file} does not exist`);
        return;
    }
    const fileSize = await fs_1.promises.stat(file).then(({ size }) => size);
    if (fileSize < maxSize) {
        return;
    }
    // We don't fail the build, because the actual hard max size is larger so it might still succeed
    console.log((0, chalk_1.redBright)((0, outdent_1.outdent) `
      The function zip ${(0, chalk_1.yellowBright)((0, path_1.relative)(process.cwd(), file))} size is ${(0, pretty_bytes_1.default)(fileSize)}, which is larger than the maximum supported size of ${(0, pretty_bytes_1.default)(maxSize)}.
      There are a few reasons this could happen. You may have accidentally bundled a large dependency, or you might have a
      large number of pre-rendered pages included.
    `));
    const zip = new node_stream_zip_1.async({ file });
    console.log(`Contains ${await zip.entriesCount} files`);
    const sortedFiles = Object.values(await zip.entries()).sort((a, b) => b.size - a.size);
    const largest = {};
    for (let i = 0; i < 10 && i < sortedFiles.length; i++) {
        largest[`${i + 1}`] = {
            File: sortedFiles[i].name,
            'Compressed Size': (0, pretty_bytes_1.default)(sortedFiles[i].compressedSize),
            'Uncompressed Size': (0, pretty_bytes_1.default)(sortedFiles[i].size),
        };
    }
    console.log((0, chalk_1.yellowBright) `\n\nThese are the largest files in the zip:`);
    console.table(largest);
    console.log((0, chalk_1.greenBright) `\n\nFor more information on fixing this, see ${(0, chalk_1.blueBright) `https://ntl.fyi/large-next-functions`}`);
};
exports.checkZipSize = checkZipSize;
const getProblematicUserRewrites = ({ redirects, basePath, }) => {
    const userRewrites = [];
    for (const redirect of redirects) {
        // This is the first of the plugin-generated redirects so we can stop checking
        if (redirect.from === `${basePath}/_next/static/*` && redirect.to === `/static/:splat` && redirect.status === 200) {
            break;
        }
        if (
        // Redirects are fine
        (redirect.status === 200 || redirect.status === 404) &&
            // Rewriting to a function is also fine
            !redirect.to.startsWith('/.netlify/') &&
            // ...so is proxying
            !redirect.to.startsWith('http')) {
            userRewrites.push(redirect);
        }
    }
    return userRewrites;
};
exports.getProblematicUserRewrites = getProblematicUserRewrites;
const warnForProblematicUserRewrites = ({ redirects, basePath, }) => {
    const userRewrites = (0, exports.getProblematicUserRewrites)({ redirects, basePath });
    if (userRewrites.length === 0) {
        return;
    }
    console.log((0, chalk_1.yellowBright)((0, outdent_1.outdent) `
      You have the following Netlify rewrite${userRewrites.length === 1 ? '' : 's'} that might cause conflicts with the Next.js plugin:

      ${(0, chalk_1.reset)(userRewrites.map(({ from, to, status }) => `- ${from} ${to} ${status}`).join('\n'))}

      For more information, see https://ntl.fyi/next-rewrites
    `));
};
exports.warnForProblematicUserRewrites = warnForProblematicUserRewrites;
const warnForRootRedirects = ({ appDir }) => {
    if ((0, fs_1.existsSync)((0, path_1.join)(appDir, '_redirects'))) {
        console.log((0, chalk_1.yellowBright)(`You have a "_redirects" file in your root directory, which is not deployed and will be ignored. If you want it to be used, please move it into "public".`));
    }
};
exports.warnForRootRedirects = warnForRootRedirects;
/* eslint-enable max-lines */
