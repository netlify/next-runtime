"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPageResolver = void 0;
const path_1 = require("path");
const outdent_1 = require("outdent");
const slash_1 = __importDefault(require("slash"));
const tiny_glob_1 = __importDefault(require("tiny-glob"));
const constants_1 = require("../constants");
// Generate a file full of require.resolve() calls for all the pages in the
// build. This is used by the nft bundler to find all the pages.
const getPageResolver = async ({ publish, target }) => {
    const functionDir = path_1.posix.resolve(path_1.posix.join('.netlify', 'functions', constants_1.HANDLER_FUNCTION_NAME));
    const root = path_1.posix.resolve((0, slash_1.default)(publish), target === 'server' ? 'server' : 'serverless', 'pages');
    const pages = await (0, tiny_glob_1.default)('**/*.js', {
        cwd: root,
        dot: true,
    });
    const pageFiles = pages
        .map((page) => `require.resolve('${path_1.posix.relative(functionDir, path_1.posix.join(root, (0, slash_1.default)(page)))}')`)
        .sort();
    return (0, outdent_1.outdent) `
    // This file is purely to allow nft to know about these pages. It should be temporary.
    exports.resolvePages = () => {
        try {
            ${pageFiles.join('\n        ')}
        } catch {}
    }
  `;
};
exports.getPageResolver = getPageResolver;
