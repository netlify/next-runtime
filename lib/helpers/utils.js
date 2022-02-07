"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findModuleFromBase = exports.shouldSkip = exports.getPreviewRewrites = exports.getApiRewrites = exports.redirectsForNextRouteWithData = exports.redirectsForNextRoute = exports.isApiRoute = exports.routeToDataRoute = exports.netlifyRoutesForNextRouteWithData = exports.toNetlifyRoute = void 0;
const globby_1 = __importDefault(require("globby"));
const pathe_1 = require("pathe");
const constants_1 = require("../constants");
const toNetlifyRoute = (nextRoute) => {
    const netlifyRoutes = [nextRoute];
    // If the route is an optional catch-all route, we need to add a second
    // Netlify route for the base path (when no parameters are present).
    // The file ending must be present!
    if (constants_1.OPTIONAL_CATCH_ALL_REGEX.test(nextRoute)) {
        let netlifyRoute = nextRoute.replace(constants_1.OPTIONAL_CATCH_ALL_REGEX, '$2');
        // create an empty string, but actually needs to be a forward slash
        if (netlifyRoute === '') {
            netlifyRoute = '/';
        }
        // When optional catch-all route is at top-level, the regex on line 19 will
        // create an incorrect route for the data route. For example, it creates
        // /_next/data/%BUILDID%.json, but NextJS looks for
        // /_next/data/%BUILDID%/index.json
        netlifyRoute = netlifyRoute.replace(/(\/_next\/data\/[^/]+).json/, '$1/index.json');
        // Add second route to the front of the array
        netlifyRoutes.unshift(netlifyRoute);
    }
    return netlifyRoutes.map((route) => route
        // Replace catch-all, e.g., [...slug]
        .replace(constants_1.CATCH_ALL_REGEX, '/:$1/*')
        // Replace optional catch-all, e.g., [[...slug]]
        .replace(constants_1.OPTIONAL_CATCH_ALL_REGEX, '/*')
        // Replace dynamic parameters, e.g., [id]
        .replace(constants_1.DYNAMIC_PARAMETER_REGEX, '/:$1'));
};
exports.toNetlifyRoute = toNetlifyRoute;
const netlifyRoutesForNextRouteWithData = ({ route, dataRoute }) => [
    ...(0, exports.toNetlifyRoute)(dataRoute),
    ...(0, exports.toNetlifyRoute)(route),
];
exports.netlifyRoutesForNextRouteWithData = netlifyRoutesForNextRouteWithData;
const routeToDataRoute = (route, buildId, locale) => `/_next/data/${buildId}${locale ? `/${locale}` : ''}${route === '/' ? '/index' : route}.json`;
exports.routeToDataRoute = routeToDataRoute;
const netlifyRoutesForNextRoute = (route, buildId, i18n) => {
    var _a;
    if (!((_a = i18n === null || i18n === void 0 ? void 0 : i18n.locales) === null || _a === void 0 ? void 0 : _a.length)) {
        return (0, exports.netlifyRoutesForNextRouteWithData)({ route, dataRoute: (0, exports.routeToDataRoute)(route, buildId) });
    }
    const { locales, defaultLocale } = i18n;
    const routes = [];
    locales.forEach((locale) => {
        // Data route is always localized
        const dataRoute = (0, exports.routeToDataRoute)(route, buildId, locale);
        routes.push(
        // Default locale is served from root, not localized
        ...(0, exports.netlifyRoutesForNextRouteWithData)({
            route: locale === defaultLocale ? route : `/${locale}${route}`,
            dataRoute,
        }));
    });
    return routes;
};
const isApiRoute = (route) => route.startsWith('/api/') || route === '/api';
exports.isApiRoute = isApiRoute;
const redirectsForNextRoute = ({ route, buildId, basePath, to, i18n, status = 200, force = false, }) => netlifyRoutesForNextRoute(route, buildId, i18n).map((redirect) => ({
    from: `${basePath}${redirect}`,
    to,
    status,
    force,
}));
exports.redirectsForNextRoute = redirectsForNextRoute;
const redirectsForNextRouteWithData = ({ route, dataRoute, basePath, to, status = 200, force = false, }) => (0, exports.netlifyRoutesForNextRouteWithData)({ route, dataRoute }).map((redirect) => ({
    from: `${basePath}${redirect}`,
    to,
    status,
    force,
}));
exports.redirectsForNextRouteWithData = redirectsForNextRouteWithData;
const getApiRewrites = (basePath) => [
    {
        from: `${basePath}/api`,
        to: constants_1.HANDLER_FUNCTION_PATH,
        status: 200,
    },
    {
        from: `${basePath}/api/*`,
        to: constants_1.HANDLER_FUNCTION_PATH,
        status: 200,
    },
];
exports.getApiRewrites = getApiRewrites;
const getPreviewRewrites = async ({ basePath, appDir }) => {
    const publicFiles = await (0, globby_1.default)('**/*', { cwd: (0, pathe_1.join)(appDir, 'public') });
    // Preview mode gets forced to the function, to bypass pre-rendered pages, but static files need to be skipped
    return [
        ...publicFiles.map((file) => ({
            from: `${basePath}/${file}`,
            // This is a no-op, but we do it to stop it matching the following rule
            to: `${basePath}/${file}`,
            conditions: { Cookie: ['__prerender_bypass', '__next_preview_data'] },
            status: 200,
        })),
        {
            from: `${basePath}/*`,
            to: constants_1.HANDLER_FUNCTION_PATH,
            status: 200,
            conditions: { Cookie: ['__prerender_bypass', '__next_preview_data'] },
            force: true,
        },
    ];
};
exports.getPreviewRewrites = getPreviewRewrites;
const shouldSkip = () => process.env.NEXT_PLUGIN_FORCE_RUN === 'false' ||
    process.env.NEXT_PLUGIN_FORCE_RUN === '0' ||
    process.env.NETLIFY_NEXT_PLUGIN_SKIP === 'true' ||
    process.env.NETLIFY_NEXT_PLUGIN_SKIP === '1';
exports.shouldSkip = shouldSkip;
/**
 * Given an array of base paths and candidate modules, return the first one that exists
 */
const findModuleFromBase = ({ paths, candidates }) => {
    for (const candidate of candidates) {
        try {
            const modulePath = require.resolve(candidate, { paths });
            if (modulePath) {
                return modulePath;
            }
        }
        catch (error) {
            console.error(error);
        }
    }
    return null;
};
exports.findModuleFromBase = findModuleFromBase;
