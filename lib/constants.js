"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIVIDER = exports.LAMBDA_MAX_SIZE = exports.MINIMUM_REVALIDATE_SECONDS = exports.DYNAMIC_PARAMETER_REGEX = exports.OPTIONAL_CATCH_ALL_REGEX = exports.CATCH_ALL_REGEX = exports.DEFAULT_FUNCTIONS_SRC = exports.HANDLER_FUNCTION_PATH = exports.ODB_FUNCTION_PATH = exports.HIDDEN_PATHS = exports.IMAGE_FUNCTION_NAME = exports.ODB_FUNCTION_NAME = exports.HANDLER_FUNCTION_NAME = void 0;
exports.HANDLER_FUNCTION_NAME = '___netlify-handler';
exports.ODB_FUNCTION_NAME = '___netlify-odb-handler';
exports.IMAGE_FUNCTION_NAME = '_ipx';
// These are paths in .next that shouldn't be publicly accessible
exports.HIDDEN_PATHS = [
    '/cache/*',
    '/server/*',
    '/serverless/*',
    '/traces',
    '/routes-manifest.json',
    '/build-manifest.json',
    '/prerender-manifest.json',
    '/react-loadable-manifest.json',
    '/BUILD_ID',
];
exports.ODB_FUNCTION_PATH = `/.netlify/builders/${exports.ODB_FUNCTION_NAME}`;
exports.HANDLER_FUNCTION_PATH = `/.netlify/functions/${exports.HANDLER_FUNCTION_NAME}`;
exports.DEFAULT_FUNCTIONS_SRC = 'netlify/functions';
exports.CATCH_ALL_REGEX = /\/\[\.{3}(.*)](.json)?$/;
exports.OPTIONAL_CATCH_ALL_REGEX = /\/\[{2}\.{3}(.*)]{2}(.json)?$/;
exports.DYNAMIC_PARAMETER_REGEX = /\/\[(.*?)]/g;
exports.MINIMUM_REVALIDATE_SECONDS = 60;
// 50MB, which is the documented max, though the hard max seems to be higher
exports.LAMBDA_MAX_SIZE = 1024 * 1024 * 50;
exports.DIVIDER = `
────────────────────────────────────────────────────────────────
`;
