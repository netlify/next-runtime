"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHandler = void 0;
const outdent_1 = require("outdent");
/* eslint-disable @typescript-eslint/no-var-requires */
const { promises } = require('fs');
const { Server } = require('http');
const path = require('path');
// eslint-disable-next-line node/prefer-global/url, node/prefer-global/url-search-params
const { URLSearchParams, URL } = require('url');
const { Bridge } = require('@vercel/node-bridge/bridge');
const { augmentFsModule, getMaxAge, getMultiValueHeaders, getNextServer } = require('./handlerUtils');
// We return a function and then call `toString()` on it to serialise it as the launcher function
// eslint-disable-next-line max-params
const makeHandler = (conf, app, pageRoot, staticManifest = [], mode = 'ssr') => {
    var _a;
    // This is just so nft knows about the page entrypoints. It's not actually used
    try {
        // eslint-disable-next-line node/no-missing-require
        require.resolve('./pages.js');
    }
    catch { }
    const ONE_YEAR_IN_SECONDS = 31536000;
    (_a = process.env).NODE_ENV || (_a.NODE_ENV = 'production');
    // We don't want to write ISR files to disk in the lambda environment
    conf.experimental.isrFlushToDisk = false;
    // This is our flag that we use when patching the source
    // eslint-disable-next-line no-underscore-dangle
    process.env._BYPASS_SSG = 'true';
    // Set during the request as it needs the host header. Hoisted so we can define the function once
    let base;
    augmentFsModule({ promises, staticManifest, pageRoot, getBase: () => base });
    // We memoize this because it can be shared between requests, but don't instantiate it until
    // the first request because we need the host and port.
    let bridge;
    const getBridge = (event) => {
        if (bridge) {
            return bridge;
        }
        const url = new URL(event.rawUrl);
        const port = Number.parseInt(url.port) || 80;
        const { host } = event.headers;
        const protocol = event.headers['x-forwarded-proto'] || 'http';
        base = `${protocol}://${host}`;
        const NextServer = getNextServer();
        const nextServer = new NextServer({
            conf,
            dir: path.resolve(__dirname, app),
            customServer: false,
            hostname: url.hostname,
            port,
        });
        const requestHandler = nextServer.getRequestHandler();
        const server = new Server(async (req, res) => {
            try {
                await requestHandler(req, res);
            }
            catch (error) {
                console.error(error);
                throw new Error('Error handling request. See function logs for details.');
            }
        });
        bridge = new Bridge(server);
        bridge.listen();
        return bridge;
    };
    return async function handler(event, context) {
        var _a, _b, _c;
        let requestMode = mode;
        // Ensure that paths are encoded - but don't double-encode them
        event.path = new URL(event.rawUrl).pathname;
        // Next expects to be able to parse the query from the URL
        const query = new URLSearchParams(event.queryStringParameters).toString();
        event.path = query ? `${event.path}?${query}` : event.path;
        const { headers, ...result } = await getBridge(event).launcher(event, context);
        // Convert all headers to multiValueHeaders
        const multiValueHeaders = getMultiValueHeaders(headers);
        if ((_b = (_a = multiValueHeaders['set-cookie']) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.includes('__prerender_bypass')) {
            delete multiValueHeaders.etag;
            multiValueHeaders['cache-control'] = ['no-cache'];
        }
        // Sending SWR headers causes undefined behaviour with the Netlify CDN
        const cacheHeader = (_c = multiValueHeaders['cache-control']) === null || _c === void 0 ? void 0 : _c[0];
        if (cacheHeader === null || cacheHeader === void 0 ? void 0 : cacheHeader.includes('stale-while-revalidate')) {
            if (requestMode === 'odb') {
                const ttl = getMaxAge(cacheHeader);
                // Long-expiry TTL is basically no TTL, so we'll skip it
                if (ttl > 0 && ttl < ONE_YEAR_IN_SECONDS) {
                    result.ttl = ttl;
                    requestMode = 'isr';
                }
            }
            multiValueHeaders['cache-control'] = ['public, max-age=0, must-revalidate'];
        }
        multiValueHeaders['x-render-mode'] = [requestMode];
        console.log(`[${event.httpMethod}] ${event.path} (${requestMode === null || requestMode === void 0 ? void 0 : requestMode.toUpperCase()})`);
        return {
            ...result,
            multiValueHeaders,
            isBase64Encoded: result.encoding === 'base64',
        };
    };
};
const getHandler = ({ isODB = false, publishDir = '../../../.next', appDir = '../../..' }) => 
// This is a string, but if you have the right editor plugin it should format as js
(0, outdent_1.outdent) `
  const { Server } = require("http");
  const { promises } = require("fs");
  // We copy the file here rather than requiring from the node module
  const { Bridge } = require("./bridge");
  const { augmentFsModule, getMaxAge, getMultiValueHeaders, getNextServer } = require('./handlerUtils')

  const { builder } = require("@netlify/functions");
  const { config }  = require("${publishDir}/required-server-files.json")
  let staticManifest 
  try {
    staticManifest = require("${publishDir}/static-manifest.json")
  } catch {}
  const path = require("path");
  const pageRoot = path.resolve(path.join(__dirname, "${publishDir}", config.target === "server" ? "server" : "serverless", "pages"));
  exports.handler = ${isODB
    ? `builder((${makeHandler.toString()})(config, "${appDir}", pageRoot, staticManifest, 'odb'));`
    : `(${makeHandler.toString()})(config, "${appDir}", pageRoot, staticManifest, 'ssr');`}
`;
exports.getHandler = getHandler;
