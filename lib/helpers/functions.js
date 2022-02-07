"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupImageFunction = exports.generatePagesResolver = exports.generateFunctions = void 0;
const node_bridge_1 = __importDefault(require("@vercel/node-bridge"));
const fs_extra_1 = require("fs-extra");
const pathe_1 = require("pathe");
const constants_1 = require("../constants");
const getHandler_1 = require("../templates/getHandler");
const getPageResolver_1 = require("../templates/getPageResolver");
const generateFunctions = async ({ FUNCTIONS_SRC = constants_1.DEFAULT_FUNCTIONS_SRC, INTERNAL_FUNCTIONS_SRC, PUBLISH_DIR }, appDir) => {
    const functionsDir = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC;
    const functionDir = (0, pathe_1.join)(process.cwd(), functionsDir, constants_1.HANDLER_FUNCTION_NAME);
    const publishDir = (0, pathe_1.relative)(functionDir, (0, pathe_1.join)(process.cwd(), PUBLISH_DIR));
    const writeHandler = async (func, isODB) => {
        const handlerSource = await (0, getHandler_1.getHandler)({ isODB, publishDir, appDir: (0, pathe_1.relative)(functionDir, appDir) });
        await (0, fs_extra_1.ensureDir)((0, pathe_1.join)(functionsDir, func));
        await (0, fs_extra_1.writeFile)((0, pathe_1.join)(functionsDir, func, `${func}.js`), handlerSource);
        await (0, fs_extra_1.copyFile)(node_bridge_1.default, (0, pathe_1.join)(functionsDir, func, 'bridge.js'));
        await (0, fs_extra_1.copyFile)((0, pathe_1.join)(__dirname, '..', '..', 'lib', 'templates', 'handlerUtils.js'), (0, pathe_1.join)(functionsDir, func, 'handlerUtils.js'));
    };
    await writeHandler(constants_1.HANDLER_FUNCTION_NAME, false);
    await writeHandler(constants_1.ODB_FUNCTION_NAME, true);
};
exports.generateFunctions = generateFunctions;
/**
 * Writes a file in each function directory that contains references to every page entrypoint.
 * This is just so that the nft bundler knows about them. We'll eventually do this better.
 */
const generatePagesResolver = async ({ constants: { INTERNAL_FUNCTIONS_SRC, FUNCTIONS_SRC = constants_1.DEFAULT_FUNCTIONS_SRC, PUBLISH_DIR }, target, }) => {
    const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC;
    const jsSource = await (0, getPageResolver_1.getPageResolver)({
        publish: PUBLISH_DIR,
        target,
    });
    await (0, fs_extra_1.writeFile)((0, pathe_1.join)(functionsPath, constants_1.ODB_FUNCTION_NAME, 'pages.js'), jsSource);
    await (0, fs_extra_1.writeFile)((0, pathe_1.join)(functionsPath, constants_1.HANDLER_FUNCTION_NAME, 'pages.js'), jsSource);
};
exports.generatePagesResolver = generatePagesResolver;
// Move our next/image function into the correct functions directory
const setupImageFunction = async ({ constants: { INTERNAL_FUNCTIONS_SRC, FUNCTIONS_SRC = constants_1.DEFAULT_FUNCTIONS_SRC }, imageconfig = {}, netlifyConfig, basePath, }) => {
    const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC;
    const functionName = `${constants_1.IMAGE_FUNCTION_NAME}.js`;
    const functionDirectory = (0, pathe_1.join)(functionsPath, constants_1.IMAGE_FUNCTION_NAME);
    await (0, fs_extra_1.ensureDir)(functionDirectory);
    await (0, fs_extra_1.writeJSON)((0, pathe_1.join)(functionDirectory, 'imageconfig.json'), {
        ...imageconfig,
        basePath: [basePath, constants_1.IMAGE_FUNCTION_NAME].join('/'),
    });
    await (0, fs_extra_1.copyFile)((0, pathe_1.join)(__dirname, '..', '..', 'lib', 'templates', 'ipx.js'), (0, pathe_1.join)(functionDirectory, functionName));
    const imagePath = imageconfig.path || '/_next/image';
    netlifyConfig.redirects.push({
        from: `${imagePath}*`,
        query: { url: ':url', w: ':width', q: ':quality' },
        to: `${basePath}/${constants_1.IMAGE_FUNCTION_NAME}/w_:width,q_:quality/:url`,
        status: 301,
    }, {
        from: `${basePath}/${constants_1.IMAGE_FUNCTION_NAME}/*`,
        to: `/.netlify/builders/${constants_1.IMAGE_FUNCTION_NAME}`,
        status: 200,
    });
    if (basePath) {
        // next/image generates image static URLs that still point at the site root
        netlifyConfig.redirects.push({
            from: '/_next/static/image/*',
            to: '/static/image/:splat',
            status: 200,
        });
    }
};
exports.setupImageFunction = setupImageFunction;
