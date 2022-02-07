"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCache = exports.restoreCache = void 0;
const path_1 = require("path");
const restoreCache = async ({ cache, publish }) => {
    const cacheDir = (0, path_1.join)(publish, 'cache');
    if (await cache.restore(cacheDir)) {
        console.log('Next.js cache restored.');
    }
    else {
        console.log('No Next.js cache to restore.');
    }
};
exports.restoreCache = restoreCache;
const saveCache = async ({ cache, publish }) => {
    const cacheDir = (0, path_1.join)(publish, 'cache');
    const buildManifest = (0, path_1.join)(publish, 'build-manifest.json');
    if (await cache.save(cacheDir, { digests: [buildManifest] })) {
        console.log('Next.js cache saved.');
    }
    else {
        console.log('No Next.js cache to save.');
    }
};
exports.saveCache = saveCache;
