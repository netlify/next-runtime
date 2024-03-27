module.exports = {
  version: 2,
  suites: {
    'test/e2e/app-dir/app-static/app-static.test.ts': {
      failed: ['app-dir static/dynamic handling should warn for too many cache tags'],
    },
    'test/e2e/app-dir/headers-static-bailout/headers-static-bailout.test.ts': {
      failed: [
        // Uses cli output
        'headers-static-bailout it provides a helpful link in case static generation bailout is uncaught',
      ],
    },
    'test/e2e/app-dir/parallel-routes-and-interception/parallel-routes-and-interception.test.ts': {
      failed: [],
      flakey: [
        // Uses patch file
        'parallel-routes-and-interception parallel routes should gracefully handle when two page segments match the `children` parallel slot',
      ],
    },
    'test/e2e/opentelemetry/opentelemetry.test.ts': {
      failed: [
        'opentelemetry root context app router should handle RSC with fetch',
        'opentelemetry incoming context propagation app router should handle RSC with fetch',
        'opentelemetry incoming context propagation app router should handle route handlers in app router',
      ],
    },
    'test/e2e/app-dir/rsc-basic/rsc-basic.test.ts': {
      failed: [
        'app dir - rsc basics should render initial styles of css-in-js in edge SSR correctly',
        'app dir - rsc basics should render initial styles of css-in-js in nodejs SSR correctly',
        'app dir - rsc basics should render server components correctly',
      ],
      flakey: [
        'app dir - rsc basics react@experimental should opt into the react@experimental when enabling ppr',
        'app dir - rsc basics react@experimental should opt into the react@experimental when enabling taint',
      ],
    },
    'test/e2e/app-dir/navigation/navigation.test.ts': {
      failed: [
        'app dir - navigation redirect status code should respond with 308 status code if permanent flag is set',
        'app dir - navigation redirect status code should respond with 307 status code in client component',
        'app dir - navigation redirect status code should respond with 307 status code in server component',
        'app dir - navigation bots should block rendering for bots and return 404 status',
        'app dir - navigation navigation between pages and app should not continously initiate a mpa navigation to the same URL when router state changes',
      ],
    },
    'test/production/app-dir/unexpected-error/unexpected-error.test.ts': {
      failed: [
        'unexpected-error should set response status to 500 for unexpected errors in ssr app route',
        'unexpected-error should set response status to 500 for unexpected errors in isr app route',
      ],
    },
    'test/e2e/skip-trailing-slash-redirect/index.test.ts': {
      flakey: [
        'skip-trailing-slash-redirect should merge cookies from middleware and API routes correctly',
        'skip-trailing-slash-redirect should merge cookies from middleware and edge API routes correctly',
        'skip-trailing-slash-redirect should handle external rewrite correctly /chained-rewrite-ssr',
        'skip-trailing-slash-redirect should handle external rewrite correctly /chained-rewrite-static',
        'skip-trailing-slash-redirect should handle external rewrite correctly /chained-rewrite-ssg',
      ],
    },
    'test/e2e/module-layer/index.test.ts': {
      flakey: [
        'module layer no server-only in server targets should render routes marked with restriction marks without errors',
        'module layer with server-only in server targets should render routes marked with restriction marks without errors',
      ],
    },
    'test/e2e/getserversideprops/test/index.test.ts': {
      flakey: [
        'getServerSideProps should set default caching header',
        'getServerSideProps should respect custom caching header',
      ],
    },
    'test/e2e/app-dir/metadata-dynamic-routes/index.test.ts': {
      pending: [],
      flakey: [
        'app dir - metadata dynamic routes text routes should handle robots.[ext] dynamic routes',
        'app dir - metadata dynamic routes text routes should handle sitemap.[ext] dynamic routes',
        'app dir - metadata dynamic routes social image routes should handle manifest.[ext] dynamic routes',
        'app dir - metadata dynamic routes social image routes should render og image with opengraph-image dynamic routes',
        'app dir - metadata dynamic routes social image routes should render og image with twitter-image dynamic routes',
        'app dir - metadata dynamic routes icon image routes should render icon with dynamic routes',
        'app dir - metadata dynamic routes icon image routes should render apple icon with dynamic routes',
        'app dir - metadata dynamic routes should inject dynamic metadata properly to head',
        'app dir - metadata dynamic routes should use localhost for local prod and fallback to deployment url when metadataBase is falsy',
      ],
    },
    'test/e2e/app-dir/metadata/metadata.test.ts': {
      flakey: [
        'app dir - metadata opengraph should pick up opengraph-image and twitter-image as static metadata files',
        'app dir - metadata static routes should have /favicon.ico as route',
        'app dir - metadata static routes should have icons as route',
      ],
    },
    'test/e2e/basepath.test.ts': {
      flakey: [
        'basePath should not update URL for a 404',
        'basePath should handle 404 urls that start with basePath',
        'basePath should show 404 for page not under the /docs prefix',
      ],
    },
    'test/e2e/app-dir/app/index.test.ts': {
      flakey: [
        'app dir - basic should return the `vary` header from edge runtime',
        'app dir - basic should return the `vary` header from pages for flight requests',
      ],
    },
    'test/e2e/app-dir/conflicting-page-segments/conflicting-page-segments.test.ts': {
      flakey: [
        'conflicting-page-segments should throw an error when a route groups causes a conflict with a parallel segment',
      ],
    },
    'test/e2e/app-dir/actions-navigation/index.test.ts': {
      flakey: [
        'app-dir action handling should handle actions correctly after following a relative link',
      ],
    },
    'test/e2e/middleware-general/test/index.test.ts': {
      flakey: [
        'Middleware Runtime with i18n should redirect the same for direct visit and client-transition',
        'Middleware Runtime without i18n should redirect the same for direct visit and client-transition',
        // These rely on Cloudflare-specific error wording
        'Middleware Runtime with i18n should allow to abort a fetch request',
        'Middleware Runtime without i18n should allow to abort a fetch request',
      ],
    },
    'test/e2e/prerender.test.ts': {
      flakey: [
        'Prerender should handle on-demand revalidate for fallback: blocking',
        // Header whitespace mismatch
        'Prerender should use correct caching headers for a revalidate page',
        // Header whitespace mismatch
        'Prerender should use correct caching headers for a no-revalidate page',
      ],
    },
    'test/e2e/app-dir/app-routes/app-custom-route-base-path.test.ts': {
      flakey: [
        // Uses cli output
        'app-custom-routes no response returned should print an error when no response is returned',
        'app-custom-routes error conditions responds with 400 (Bad Request) when the requested method is not a valid HTTP method',
      ],
    },
    'test/e2e/app-dir/app-routes/app-custom-routes.test.ts': {
      flakey: [
        // Uses cli output
        'app-custom-routes no response returned should print an error when no response is returned',
        'app-custom-routes error conditions responds with 400 (Bad Request) when the requested method is not a valid HTTP method',
      ],
    },
    'test/e2e/app-dir/actions/app-action.test.ts': {
      flakey: [
        // Uses cli output
        'app-dir action handling should log a warning when a server action is not found but an id is provided',
        'app-dir action handling should work with interception routes',
      ],
    },
  },
  rules: {
    include: ['test/e2e/**/*.test.{t,j}s{,x}'],
    exclude: [
      // This is a template, not a real test file
      'test/e2e/test-template/{{ toFileName name }}/{{ toFileName name }}.test.ts',
      'test/e2e/app-dir/next-font/**/*',
      // We don't support PPR
      'test/e2e/app-dir/ppr/**/*',
      'test/e2e/app-dir/ppr-*/**/*',
      'test/e2e/app-dir/app-prefetch*/**/*',
      'test/e2e/app-dir/app-esm-js/index.test.ts',
      'test/e2e/app-dir/interception-middleware-rewrite/interception-middleware-rewrite.test.ts',
      'test/e2e/app-dir/searchparams-static-bailout/searchparams-static-bailout.test.ts',
      'test/e2e/app-dir/app-compilation/index.test.ts',
      'test/e2e/cancel-request/stream-cancel.test.ts',
      'test/e2e/favicon-short-circuit/favicon-short-circuit.test.ts',
      'test/e2e/edge-pages-support/edge-document.test.ts',
      'test/e2e/third-parties/index.test.ts',
      // Uses cli output
      'test/e2e/swc-warnings/index.test.ts',
      'test/e2e/app-dir/externals/externals.test.ts',
      'test/e2e/app-dir/use-selected-layout-segment-s/use-selected-layout-segment-s.test.ts',
      'test/e2e/repeated-forward-slashes-error/repeated-forward-slashes-error.test.ts',
      'test/e2e/app-dir/with-exported-function-config/with-exported-function-config.test.ts',
      'test/e2e/app-dir/x-forwarded-headers/x-forwarded-headers.test.ts',
      'test/e2e/app-dir/third-parties/basic.test.ts',
      'test/e2e/app-dir/conflicting-page-segments/conflicting-page-segments.test.ts',
      'test/e2e/404-page-router/index.test.ts',
      'test/e2e/app-dir/app-client-cache/client-cache.test.ts',
      'test/e2e/app-dir/app-fetch-deduping/app-fetch-deduping.test.ts',
      'test/e2e/app-dir/app/experimental-compile.test.ts',
      'test/e2e/app-dir/app/standalone-gsp.test.ts',
      'test/e2e/app-dir/app/standalone.test.ts',
      'test/e2e/app-dir/app/vercel-speed-insights.test.ts',
      'test/e2e/app-dir/build-size/index.test.ts',
      'test/e2e/app-dir/create-root-layout/create-root-layout.test.ts',
      'test/e2e/app-dir/headers-static-bailout/headers-static-bailout.test.ts',
      'test/e2e/app-dir/rewrites-redirects/rewrites-redirects.test.ts',
      'test/e2e/edge-compiler-can-import-blob-assets/index.test.ts',
      'test/e2e/i18n-data-fetching-redirect/index.test.ts',
      'test/e2e/manual-client-base-path/index.test.ts',
      'test/e2e/no-eslint-warn-with-no-eslint-config/index.test.ts',
      'test/e2e/switchable-runtime/index.test.ts',
      'test/e2e/trailingslash-with-rewrite/index.test.ts',
      'test/e2e/transpile-packages/index.test.ts',
      'test/e2e/typescript-version-no-warning/typescript-version-no-warning.test.ts',
      'test/e2e/typescript-version-warning/typescript-version-warning.test.ts',
      'test/e2e/app-dir/app/useReportWebVitals.test.ts',
      'test/e2e/app-dir/app-static/app-static-custom-handler.test.ts',
      // Tries to patch deployed files
      'test/e2e/app-dir/missing-suspense-with-csr-bailout/missing-suspense-with-csr-bailout.test.ts',
      // Tries to patch deployed files
      'test/e2e/module-layer/module-layer.test.ts',
      // Hard-coded localhost URL
      'test/e2e/app-dir/next-image/next-image-proxy.test.ts',
      'test/e2e/proxy-request-with-middleware/test/index.test.ts',
      // Uses invalid WASM syntax
      'test/e2e/edge-can-use-wasm-files/index.test.ts',
      // Expected behaviour does not match next start
      'test/e2e/i18n-data-route/i18n-data-route.test.ts',
    ],
  },
}
