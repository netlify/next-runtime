"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRedirects = exports.generateStaticRedirects = void 0;
const chalk_1 = require("chalk");
const fs_extra_1 = require("fs-extra");
const outdent_1 = require("outdent");
const pathe_1 = require("pathe");
const constants_1 = require("../constants");
const files_1 = require("./files");
const utils_1 = require("./utils");
const matchesMiddleware = (middleware, route) => middleware.some((middlewarePath) => route.startsWith(middlewarePath));
const generateLocaleRedirects = ({ i18n, basePath, trailingSlash, }) => {
    const redirects = [];
    // If the cookie is set, we need to redirect at the origin
    redirects.push({
        from: `${basePath}/`,
        to: constants_1.HANDLER_FUNCTION_PATH,
        status: 200,
        force: true,
        conditions: {
            Cookie: ['NEXT_LOCALE'],
        },
    });
    i18n.locales.forEach((locale) => {
        if (locale === i18n.defaultLocale) {
            return;
        }
        redirects.push({
            from: `${basePath}/`,
            to: `${basePath}/${locale}${trailingSlash ? '/' : ''}`,
            status: 301,
            conditions: {
                Language: [locale],
            },
            force: true,
        });
    });
    return redirects;
};
const generateStaticRedirects = ({ netlifyConfig, nextConfig: { i18n, basePath }, }) => {
    // Static files are in `static`
    netlifyConfig.redirects.push({ from: `${basePath}/_next/static/*`, to: `/static/:splat`, status: 200 });
    if (i18n) {
        netlifyConfig.redirects.push({ from: `${basePath}/:locale/_next/static/*`, to: `/static/:splat`, status: 200 });
    }
};
exports.generateStaticRedirects = generateStaticRedirects;
/**
 * Routes that match middleware need to always use the SSR function
 * This generates a rewrite for every middleware in every locale, both with and without a splat
 */
const generateMiddlewareRewrites = ({ basePath, middleware, i18n, buildId }) => {
    const handlerRewrite = (from) => ({
        from: `${basePath}${from}`,
        to: constants_1.HANDLER_FUNCTION_PATH,
        status: 200,
    });
    return (middleware
        .map((route) => {
        var _a;
        const unlocalized = [handlerRewrite(`${route}`), handlerRewrite(`${route}/*`)];
        if (((_a = i18n === null || i18n === void 0 ? void 0 : i18n.locales) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            const localized = i18n.locales.map((locale) => [
                handlerRewrite(`/${locale}${route}`),
                handlerRewrite(`/${locale}${route}/*`),
                handlerRewrite(`/_next/data/${buildId}/${locale}${route}/*`),
            ]);
            // With i18n, all data routes are prefixed with the locale, but the HTML also has the unprefixed default
            return [...unlocalized, ...localized];
        }
        return [...unlocalized, handlerRewrite(`/_next/data/${buildId}${route}/*`)];
    })
        // Flatten the array of arrays. Can't use flatMap as it might be 2 levels deep
        .flat(2));
};
const generateStaticIsrRewrites = ({ staticRouteEntries, basePath, i18n, buildId, middleware, }) => {
    const staticIsrRoutesThatMatchMiddleware = [];
    const staticRoutePaths = new Set();
    const staticIsrRewrites = [];
    staticRouteEntries.forEach(([route, { initialRevalidateSeconds }]) => {
        if ((0, utils_1.isApiRoute)(route)) {
            return;
        }
        staticRoutePaths.add(route);
        if (initialRevalidateSeconds === false) {
            // These can be ignored, as they're static files handled by the CDN
            return;
        }
        // The default locale is served from the root, not the localised path
        if ((i18n === null || i18n === void 0 ? void 0 : i18n.defaultLocale) && route.startsWith(`/${i18n.defaultLocale}/`)) {
            route = route.slice(i18n.defaultLocale.length + 1);
            staticRoutePaths.add(route);
            if (matchesMiddleware(middleware, route)) {
                staticIsrRoutesThatMatchMiddleware.push(route);
            }
            staticIsrRewrites.push(...(0, utils_1.redirectsForNextRouteWithData)({
                route,
                dataRoute: (0, utils_1.routeToDataRoute)(route, buildId, i18n.defaultLocale),
                basePath,
                to: constants_1.ODB_FUNCTION_PATH,
                force: true,
            }));
        }
        else if (matchesMiddleware(middleware, route)) {
            //  Routes that match middleware can't use the ODB
            staticIsrRoutesThatMatchMiddleware.push(route);
        }
        else {
            // ISR routes use the ODB handler
            staticIsrRewrites.push(
            // No i18n, because the route is already localized
            ...(0, utils_1.redirectsForNextRoute)({ route, basePath, to: constants_1.ODB_FUNCTION_PATH, force: true, buildId, i18n: null }));
        }
    });
    return {
        staticRoutePaths,
        staticIsrRoutesThatMatchMiddleware,
        staticIsrRewrites,
    };
};
/**
 * Generate rewrites for all dynamic routes
 */
const generateDynamicRewrites = ({ dynamicRoutes, prerenderedDynamicRoutes, middleware, basePath, buildId, i18n, }) => {
    const dynamicRewrites = [];
    const dynamicRoutesThatMatchMiddleware = [];
    dynamicRoutes.forEach((route) => {
        if ((0, utils_1.isApiRoute)(route.page)) {
            return;
        }
        if (route.page in prerenderedDynamicRoutes) {
            if (matchesMiddleware(middleware, route.page)) {
                dynamicRoutesThatMatchMiddleware.push(route.page);
            }
            else {
                dynamicRewrites.push(...(0, utils_1.redirectsForNextRoute)({ buildId, route: route.page, basePath, to: constants_1.ODB_FUNCTION_PATH, status: 200, i18n }));
            }
        }
        else {
            // If the route isn't prerendered, it's SSR
            dynamicRewrites.push(...(0, utils_1.redirectsForNextRoute)({ route: route.page, buildId, basePath, to: constants_1.HANDLER_FUNCTION_PATH, i18n }));
        }
    });
    return {
        dynamicRoutesThatMatchMiddleware,
        dynamicRewrites,
    };
};
const generateRedirects = async ({ netlifyConfig, nextConfig: { i18n, basePath, trailingSlash, appDir }, buildId, }) => {
    const { dynamicRoutes: prerenderedDynamicRoutes, routes: prerenderedStaticRoutes } = await (0, fs_extra_1.readJSON)((0, pathe_1.join)(netlifyConfig.build.publish, 'prerender-manifest.json'));
    const { dynamicRoutes, staticRoutes } = await (0, fs_extra_1.readJSON)((0, pathe_1.join)(netlifyConfig.build.publish, 'routes-manifest.json'));
    netlifyConfig.redirects.push(...constants_1.HIDDEN_PATHS.map((path) => ({
        from: `${basePath}${path}`,
        to: '/404.html',
        status: 404,
        force: true,
    })));
    if (i18n && i18n.localeDetection !== false) {
        netlifyConfig.redirects.push(...generateLocaleRedirects({ i18n, basePath, trailingSlash }));
    }
    // This is only used in prod, so dev uses `next dev` directly
    netlifyConfig.redirects.push(
    // API routes always need to be served from the regular function
    ...(0, utils_1.getApiRewrites)(basePath), 
    // Preview mode gets forced to the function, to bypass pre-rendered pages, but static files need to be skipped
    ...(await (0, utils_1.getPreviewRewrites)({ basePath, appDir })));
    const middleware = await (0, files_1.getMiddleware)(netlifyConfig.build.publish);
    netlifyConfig.redirects.push(...generateMiddlewareRewrites({ basePath, i18n, middleware, buildId }));
    const staticRouteEntries = Object.entries(prerenderedStaticRoutes);
    const routesThatMatchMiddleware = [];
    const { staticRoutePaths, staticIsrRewrites, staticIsrRoutesThatMatchMiddleware } = generateStaticIsrRewrites({
        staticRouteEntries,
        basePath,
        i18n,
        buildId,
        middleware,
    });
    routesThatMatchMiddleware.push(...staticIsrRoutesThatMatchMiddleware);
    netlifyConfig.redirects.push(...staticIsrRewrites);
    // Add rewrites for all static SSR routes. This is Next 12+
    staticRoutes === null || staticRoutes === void 0 ? void 0 : staticRoutes.forEach((route) => {
        if (staticRoutePaths.has(route.page) || (0, utils_1.isApiRoute)(route.page)) {
            // Prerendered static routes are either handled by the CDN or are ISR
            return;
        }
        netlifyConfig.redirects.push(...(0, utils_1.redirectsForNextRoute)({ route: route.page, buildId, basePath, to: constants_1.HANDLER_FUNCTION_PATH, i18n }));
    });
    // Add rewrites for all dynamic routes (both SSR and ISR)
    const { dynamicRewrites, dynamicRoutesThatMatchMiddleware } = generateDynamicRewrites({
        dynamicRoutes,
        prerenderedDynamicRoutes,
        middleware,
        basePath,
        buildId,
        i18n,
    });
    netlifyConfig.redirects.push(...dynamicRewrites);
    routesThatMatchMiddleware.push(...dynamicRoutesThatMatchMiddleware);
    // Final fallback
    netlifyConfig.redirects.push({
        from: `${basePath}/*`,
        to: constants_1.HANDLER_FUNCTION_PATH,
        status: 200,
    });
    const middlewareMatches = new Set(routesThatMatchMiddleware).size;
    if (middlewareMatches > 0) {
        console.log((0, chalk_1.yellowBright)((0, outdent_1.outdent) `
        There ${middlewareMatches === 1
            ? `is one statically-generated or ISR route that matches`
            : `are ${middlewareMatches} statically-generated or ISR routes that match`} a middleware function. Matched routes will always be served from the SSR function and will not use ISR or be served from the CDN.
        If this was not intended, ensure that your middleware only matches routes that you intend to use SSR.
      `));
    }
};
exports.generateRedirects = generateRedirects;
/* eslint-enable max-lines */
