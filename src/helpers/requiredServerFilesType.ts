/* eslint-disable eslint-comments/disable-enable-pair, @typescript-eslint/no-empty-interface, no-use-before-define */
/**
 * This was generated using @see {@link https://quicktype.io/}, and using the 
 * demo's {@code demos/default/.next/required-server-files.json} file. I was
 * unable to find any types for this file so instead this was manually generated
 */

export interface RequiredServerFiles {
    version?: number;
    config?:  Config;
    appDir?:  string;
    files?:   string[];
    ignore?:  string[];
}

export interface Env {
}

export interface Config {
    env?:                         Env;
    webpack?:                     null;
    webpackDevMiddleware?:        null;
    eslint?:                      Eslint;
    typescript?:                  Typescript;
    distDir?:                     string;
    cleanDistDir?:                boolean;
    assetPrefix?:                 string;
    configOrigin?:                string;
    useFileSystemPublicRoutes?:   boolean;
    generateEtags?:               boolean;
    pageExtensions?:              string[];
    target?:                      string;
    poweredByHeader?:             boolean;
    compress?:                    boolean;
    analyticsId?:                 string;
    images?:                      Images;
    devIndicators?:               DevIndicators;
    onDemandEntries?:             OnDemandEntries;
    amp?:                         Amp;
    basePath?:                    string;
    sassOptions?:                 Env;
    trailingSlash?:               boolean;
    i18n?:                        I18N;
    productionBrowserSourceMaps?: boolean;
    optimizeFonts?:               boolean;
    excludeDefaultMomentLocales?: boolean;
    serverRuntimeConfig?:         Env;
    publicRuntimeConfig?:         Env;
    reactStrictMode?:             boolean;
    httpAgentOptions?:            HTTPAgentOptions;
    outputFileTracing?:           boolean;
    staticPageGenerationTimeout?: number;
    swcMinify?:                   boolean;
    experimental?:                Experimental;
    future?:                      Future;
    configFileName?:              string;
}

export interface Amp {
    canonicalBase?: string;
}

export interface DevIndicators {
    buildActivity?:         boolean;
    buildActivityPosition?: string;
}

export interface Eslint {
    ignoreDuringBuilds?: boolean;
}

export interface Experimental {
    cpus?:                    number;
    sharedPool?:              boolean;
    plugins?:                 boolean;
    profiling?:               boolean;
    isrFlushToDisk?:          boolean;
    workerThreads?:           boolean;
    pageEnv?:                 boolean;
    optimizeImages?:          boolean;
    optimizeCss?:             boolean;
    scrollRestoration?:       boolean;
    externalDir?:             boolean;
    reactRoot?:               boolean;
    disableOptimizedLoading?: boolean;
    gzipSize?:                boolean;
    craCompat?:               boolean;
    esmExternals?:            boolean;
    isrMemoryCacheSize?:      number;
    concurrentFeatures?:      boolean;
    serverComponents?:        boolean;
    fullySpecified?:          boolean;
    outputFileTracingRoot?:   string;
    outputStandalone?:        boolean;
}

export interface Future {
    strictPostcssConfiguration?: boolean;
}

export interface HTTPAgentOptions {
    keepAlive?: boolean;
}

export interface I18N {
    defaultLocale?: string;
    locales?:       string[];
}

export interface Images {
    deviceSizes?:         number[];
    imageSizes?:          number[];
    path?:                string;
    loader?:              string;
    domains?:             any[];
    disableStaticImages?: boolean;
    minimumCacheTTL?:     number;
    formats?:             string[];
}

export interface OnDemandEntries {
    maxInactiveAge?:    number;
    pagesBufferLength?: number;
}

export interface Typescript {
    ignoreBuildErrors?: boolean;
    tsconfigPath?:      string;
}
