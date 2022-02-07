"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.movePublicFiles = exports.unpatchNextFiles = exports.patchNextFiles = exports.moveStaticPages = exports.getMiddleware = exports.matchesRewrite = exports.matchesRedirect = exports.matchMiddleware = exports.stripLocale = exports.isDynamicRoute = void 0;
/* eslint-disable max-lines */
const os_1 = require("os");
const chalk_1 = require("chalk");
const fs_extra_1 = require("fs-extra");
const globby_1 = __importDefault(require("globby"));
const outdent_1 = require("outdent");
const p_limit_1 = __importDefault(require("p-limit"));
const pathe_1 = require("pathe");
const slash_1 = __importDefault(require("slash"));
const constants_1 = require("../constants");
const utils_1 = require("./utils");
const TEST_ROUTE = /(|\/)\[[^/]+?](\/|\.html|$)/;
const isDynamicRoute = (route) => TEST_ROUTE.test(route);
exports.isDynamicRoute = isDynamicRoute;
const stripLocale = (rawPath, locales = []) => {
    const [locale, ...segments] = rawPath.split('/');
    if (locales.includes(locale)) {
        return segments.join('/');
    }
    return rawPath;
};
exports.stripLocale = stripLocale;
const matchMiddleware = (middleware, filePath) => (middleware === null || middleware === void 0 ? void 0 : middleware.includes('')) ||
    (middleware === null || middleware === void 0 ? void 0 : middleware.find((middlewarePath) => filePath === middlewarePath || filePath === `${middlewarePath}.html` || filePath.startsWith(`${middlewarePath}/`)));
exports.matchMiddleware = matchMiddleware;
const matchesRedirect = (file, redirects) => {
    if (!Array.isArray(redirects)) {
        return false;
    }
    return redirects.some((redirect) => {
        if (!redirect.regex || redirect.internal) {
            return false;
        }
        // Strips the extension from the file path
        return new RegExp(redirect.regex).test(`/${file.slice(0, -5)}`);
    });
};
exports.matchesRedirect = matchesRedirect;
const matchesRewrite = (file, rewrites) => {
    if (Array.isArray(rewrites)) {
        return (0, exports.matchesRedirect)(file, rewrites);
    }
    if (!Array.isArray(rewrites === null || rewrites === void 0 ? void 0 : rewrites.beforeFiles)) {
        return false;
    }
    return (0, exports.matchesRedirect)(file, rewrites.beforeFiles);
};
exports.matchesRewrite = matchesRewrite;
const getMiddleware = async (publish) => {
    var _a;
    const manifestPath = (0, pathe_1.join)(publish, 'server', 'middleware-manifest.json');
    if ((0, fs_extra_1.existsSync)(manifestPath)) {
        const manifest = await (0, fs_extra_1.readJson)(manifestPath, { throws: false });
        return (_a = manifest === null || manifest === void 0 ? void 0 : manifest.sortedMiddleware) !== null && _a !== void 0 ? _a : [];
    }
    return [];
};
exports.getMiddleware = getMiddleware;
// eslint-disable-next-line max-lines-per-function
const moveStaticPages = async ({ netlifyConfig, target, i18n, }) => {
    console.log('Moving static page files to serve from CDN...');
    const outputDir = (0, pathe_1.join)(netlifyConfig.build.publish, target === 'server' ? 'server' : 'serverless');
    const root = (0, pathe_1.join)(outputDir, 'pages');
    const buildId = (0, fs_extra_1.readFileSync)((0, pathe_1.join)(netlifyConfig.build.publish, 'BUILD_ID'), 'utf8').trim();
    const dataDir = (0, pathe_1.join)('_next', 'data', buildId);
    await (0, fs_extra_1.ensureDir)(dataDir);
    // Load the middleware manifest so we can check if a file matches it before moving
    const middlewarePaths = await (0, exports.getMiddleware)(netlifyConfig.build.publish);
    const middleware = middlewarePaths.map((path) => path.slice(1));
    const prerenderManifest = await (0, fs_extra_1.readJson)((0, pathe_1.join)(netlifyConfig.build.publish, 'prerender-manifest.json'));
    const { redirects, rewrites } = await (0, fs_extra_1.readJson)((0, pathe_1.join)(netlifyConfig.build.publish, 'routes-manifest.json'));
    const isrFiles = new Set();
    const shortRevalidateRoutes = [];
    Object.entries(prerenderManifest.routes).forEach(([route, { initialRevalidateSeconds }]) => {
        if (initialRevalidateSeconds) {
            // Find all files used by ISR routes
            const trimmedPath = route === '/' ? 'index' : route.slice(1);
            isrFiles.add(`${trimmedPath}.html`);
            isrFiles.add(`${trimmedPath}.json`);
            if (initialRevalidateSeconds < constants_1.MINIMUM_REVALIDATE_SECONDS) {
                shortRevalidateRoutes.push({ Route: route, Revalidate: initialRevalidateSeconds });
            }
        }
    });
    const files = [];
    const filesManifest = {};
    const moveFile = async (file) => {
        const isData = file.endsWith('.json');
        const source = (0, pathe_1.join)(root, file);
        const targetFile = isData ? (0, pathe_1.join)(dataDir, file) : file;
        files.push(file);
        filesManifest[file] = targetFile;
        const dest = (0, pathe_1.join)(netlifyConfig.build.publish, targetFile);
        try {
            await (0, fs_extra_1.move)(source, dest);
        }
        catch (error) {
            console.warn('Error moving file', source, error);
        }
    };
    // Move all static files, except error documents and nft manifests
    const pages = await (0, globby_1.default)(['**/*.{html,json}', '!**/(500|404|*.js.nft).{html,json}'], {
        cwd: root,
        dot: true,
    });
    const matchingMiddleware = new Set();
    const matchedPages = new Set();
    const matchedRedirects = new Set();
    const matchedRewrites = new Set();
    // Limit concurrent file moves to number of cpus or 2 if there is only 1
    const limit = (0, p_limit_1.default)(Math.max(2, (0, os_1.cpus)().length));
    const promises = pages.map((rawPath) => {
        const filePath = (0, slash_1.default)(rawPath);
        // Don't move ISR files, as they're used for the first request
        if (isrFiles.has(filePath)) {
            return;
        }
        if ((0, exports.isDynamicRoute)(filePath)) {
            return;
        }
        if ((0, exports.matchesRedirect)(filePath, redirects)) {
            matchedRedirects.add(filePath);
            return;
        }
        if ((0, exports.matchesRewrite)(filePath, rewrites)) {
            matchedRewrites.add(filePath);
            return;
        }
        // Middleware matches against the unlocalised path
        const unlocalizedPath = (0, exports.stripLocale)(rawPath, i18n === null || i18n === void 0 ? void 0 : i18n.locales);
        const middlewarePath = (0, exports.matchMiddleware)(middleware, unlocalizedPath);
        // If a file matches middleware it can't be offloaded to the CDN, and needs to stay at the origin to be served by next/server
        if (middlewarePath) {
            matchingMiddleware.add(middlewarePath);
            matchedPages.add(rawPath);
            return;
        }
        return limit(moveFile, filePath);
    });
    await Promise.all(promises);
    console.log(`Moved ${files.length} files`);
    if (matchedPages.size !== 0) {
        console.log((0, chalk_1.yellowBright)((0, outdent_1.outdent) `
        Skipped moving ${matchedPages.size} ${matchedPages.size === 1 ? 'file because it matches' : 'files because they match'} middleware, so cannot be deployed to the CDN and will be served from the origin instead.
        This is fine, but we're letting you know because it may not be what you expect.
      `));
        console.log((0, outdent_1.outdent) `
        The following middleware matched statically-rendered pages:

        ${(0, chalk_1.yellowBright)([...matchingMiddleware].map((mid) => `- /${mid}/_middleware`).join('\n'))}
        ${constants_1.DIVIDER}
      `);
        // There could potentially be thousands of matching pages, so we don't want to spam the console with this
        if (matchedPages.size < 50) {
            console.log((0, outdent_1.outdent) `
          The following files matched middleware and were not moved to the CDN:

          ${(0, chalk_1.yellowBright)([...matchedPages].map((mid) => `- ${mid}`).join('\n'))}
          ${constants_1.DIVIDER}
        `);
        }
    }
    if (matchedRedirects.size !== 0 || matchedRewrites.size !== 0) {
        console.log((0, chalk_1.yellowBright)((0, outdent_1.outdent) `
        Skipped moving ${matchedRedirects.size + matchedRewrites.size} files because they match redirects or beforeFiles rewrites, so cannot be deployed to the CDN and will be served from the origin instead.
      `));
        if (matchedRedirects.size < 50 && matchedRedirects.size !== 0) {
            console.log((0, outdent_1.outdent) `
          The following files matched redirects and were not moved to the CDN:

          ${(0, chalk_1.yellowBright)([...matchedRedirects].map((mid) => `- ${mid}`).join('\n'))}
          ${constants_1.DIVIDER}
        `);
        }
        if (matchedRewrites.size < 50 && matchedRewrites.size !== 0) {
            console.log((0, outdent_1.outdent) `
          The following files matched beforeFiles rewrites and were not moved to the CDN:

          ${(0, chalk_1.yellowBright)([...matchedRewrites].map((mid) => `- ${mid}`).join('\n'))}
          ${constants_1.DIVIDER}
        `);
        }
    }
    // Write the manifest for use in the serverless functions
    await (0, fs_extra_1.writeJson)((0, pathe_1.join)(netlifyConfig.build.publish, 'static-manifest.json'), Object.entries(filesManifest));
    if (i18n === null || i18n === void 0 ? void 0 : i18n.defaultLocale) {
        // Copy the default locale into the root
        const defaultLocaleDir = (0, pathe_1.join)(netlifyConfig.build.publish, i18n.defaultLocale);
        if ((0, fs_extra_1.existsSync)(defaultLocaleDir)) {
            await (0, fs_extra_1.copy)(defaultLocaleDir, `${netlifyConfig.build.publish}/`);
        }
        const defaultLocaleIndex = (0, pathe_1.join)(netlifyConfig.build.publish, `${i18n.defaultLocale}.html`);
        const indexHtml = (0, pathe_1.join)(netlifyConfig.build.publish, 'index.html');
        if ((0, fs_extra_1.existsSync)(defaultLocaleIndex) && !(0, fs_extra_1.existsSync)(indexHtml)) {
            try {
                await (0, fs_extra_1.copy)(defaultLocaleIndex, indexHtml, { overwrite: false });
                await (0, fs_extra_1.copy)((0, pathe_1.join)(netlifyConfig.build.publish, `${i18n.defaultLocale}.json`), (0, pathe_1.join)(netlifyConfig.build.publish, 'index.json'), { overwrite: false });
            }
            catch { }
        }
    }
    if (shortRevalidateRoutes.length !== 0) {
        console.log((0, outdent_1.outdent) `
      The following routes use "revalidate" values of under ${constants_1.MINIMUM_REVALIDATE_SECONDS} seconds, which is not supported.
      They will use a revalidate time of ${constants_1.MINIMUM_REVALIDATE_SECONDS} seconds instead.
    `);
        console.table(shortRevalidateRoutes);
        // TODO: add these docs
        // console.log(
        //   outdent`
        //     For more information, see https://ntl.fyi/next-revalidate-time
        //     ${DIVIDER}
        //   `,
        // )
    }
};
exports.moveStaticPages = moveStaticPages;
/**
 * Attempt to patch a source file, preserving a backup
 */
const patchFile = async ({ file, from, to }) => {
    if (!(0, fs_extra_1.existsSync)(file)) {
        console.warn('File was not found');
        return false;
    }
    const content = await (0, fs_extra_1.readFile)(file, 'utf8');
    if (content.includes(to)) {
        console.log('File already patched');
        return false;
    }
    const newContent = content.replace(from, to);
    if (newContent === content) {
        console.warn('File was not changed');
        return false;
    }
    await (0, fs_extra_1.writeFile)(`${file}.orig`, content);
    await (0, fs_extra_1.writeFile)(file, newContent);
    console.log('Done');
    return true;
};
/**
 * The file we need has moved around a bit over the past few versions,
 * so we iterate through the options until we find it
 */
const getServerFile = (root) => {
    const candidates = [
        'next/dist/server/base-server',
        'next/dist/server/next-server',
        'next/dist/next-server/server/next-server',
    ];
    return (0, utils_1.findModuleFromBase)({ candidates, paths: [root] });
};
const patchNextFiles = (root) => {
    const serverFile = getServerFile(root);
    console.log(`Patching ${serverFile}`);
    if (serverFile) {
        return patchFile({
            file: serverFile,
            from: `let ssgCacheKey = `,
            to: `let ssgCacheKey = process.env._BYPASS_SSG || `,
        });
    }
    return false;
};
exports.patchNextFiles = patchNextFiles;
const unpatchNextFiles = async (root) => {
    const serverFile = getServerFile(root);
    const origFile = `${serverFile}.orig`;
    if ((0, fs_extra_1.existsSync)(origFile)) {
        await (0, fs_extra_1.move)(origFile, serverFile, { overwrite: true });
    }
};
exports.unpatchNextFiles = unpatchNextFiles;
const movePublicFiles = async ({ appDir, outdir, publish, }) => {
    // `outdir` is a config property added when using Next.js with Nx. It's typically
    // a relative path outside of the appDir, e.g. '../../dist/apps/<app-name>', and
    // the parent directory of the .next directory.
    // If it exists, copy the files from the public folder there in order to include
    // any files that were generated during the build. Otherwise, copy the public
    // directory from the original app directory.
    const publicDir = outdir ? (0, pathe_1.join)(appDir, outdir, 'public') : (0, pathe_1.join)(appDir, 'public');
    if ((0, fs_extra_1.existsSync)(publicDir)) {
        await (0, fs_extra_1.copy)(publicDir, `${publish}/`);
    }
};
exports.movePublicFiles = movePublicFiles;
/* eslint-enable max-lines */
