"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureHandlerFunctions = exports.getNextConfig = void 0;
const fs_extra_1 = require("fs-extra");
const pathe_1 = require("pathe");
const slash_1 = __importDefault(require("slash"));
const constants_1 = require("../constants");
const defaultFailBuild = (message, { error }) => {
    throw new Error(`${message}\n${error && error.stack}`);
};
const getNextConfig = async function getNextConfig({ publish, failBuild = defaultFailBuild, }) {
    try {
        const { config, appDir, ignore } = await (0, fs_extra_1.readJSON)((0, pathe_1.join)(publish, 'required-server-files.json'));
        if (!config) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return failBuild('Error loading your Next config');
        }
        return { ...config, appDir, ignore };
    }
    catch (error) {
        return failBuild('Error loading your Next config', { error });
    }
};
exports.getNextConfig = getNextConfig;
const resolveModuleRoot = (moduleName) => {
    try {
        return (0, pathe_1.dirname)((0, pathe_1.relative)(process.cwd(), require.resolve(`${moduleName}/package.json`, { paths: [process.cwd()] })));
    }
    catch {
        return null;
    }
};
const DEFAULT_EXCLUDED_MODULES = ['sharp', 'electron'];
const configureHandlerFunctions = ({ netlifyConfig, publish, ignore = [] }) => {
    var _a;
    /* eslint-disable no-underscore-dangle */
    (_a = netlifyConfig.functions)._ipx || (_a._ipx = {});
    netlifyConfig.functions._ipx.node_bundler = 'nft';
    [constants_1.HANDLER_FUNCTION_NAME, constants_1.ODB_FUNCTION_NAME].forEach((functionName) => {
        var _a, _b;
        (_a = netlifyConfig.functions)[functionName] || (_a[functionName] = { included_files: [], external_node_modules: [] });
        netlifyConfig.functions[functionName].node_bundler = 'nft';
        (_b = netlifyConfig.functions[functionName]).included_files || (_b.included_files = []);
        netlifyConfig.functions[functionName].included_files.push('.env', '.env.local', '.env.production', '.env.production.local', `${publish}/server/**`, `${publish}/serverless/**`, `${publish}/*.json`, `${publish}/BUILD_ID`, `${publish}/static/chunks/webpack-middleware*.js`, `!${publish}/server/**/*.js.nft.json`, ...ignore.map((path) => `!${(0, slash_1.default)(path)}`));
        const nextRoot = resolveModuleRoot('next');
        if (nextRoot) {
            netlifyConfig.functions[functionName].included_files.push(`!${nextRoot}/dist/server/lib/squoosh/**/*.wasm`, `!${nextRoot}/dist/next-server/server/lib/squoosh/**/*.wasm`, `!${nextRoot}/dist/compiled/webpack/bundle4.js`, `!${nextRoot}/dist/compiled/webpack/bundle5.js`, `!${nextRoot}/dist/compiled/terser/bundle.min.js`);
        }
        DEFAULT_EXCLUDED_MODULES.forEach((moduleName) => {
            const moduleRoot = resolveModuleRoot(moduleName);
            if (moduleRoot) {
                netlifyConfig.functions[functionName].included_files.push(`!${moduleRoot}/**/*`);
            }
        });
    });
};
exports.configureHandlerFunctions = configureHandlerFunctions;
