# Changelog

## [5.0.0-alpha.2](https://github.com/netlify/next-runtime-minimal/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2023-11-13)


### Bug Fixes

* don't prepare tests on postinstall ([#61](https://github.com/netlify/next-runtime-minimal/issues/61)) ([a095a4c](https://github.com/netlify/next-runtime-minimal/commit/a095a4c008cab3f3a6ab2f9645f2974bedf4a753))

## [5.0.0-alpha.1](https://github.com/netlify/next-runtime-minimal/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2023-11-13)


### Bug Fixes

* requesting page router static assets ([#58](https://github.com/netlify/next-runtime-minimal/issues/58)) ([c893ad1](https://github.com/netlify/next-runtime-minimal/commit/c893ad17e31ce3912a20f8a22d476c2937a81a99))


### Miscellaneous Chores

* release 5.0.0-alpha.0 ([aaf9085](https://github.com/netlify/next-runtime-minimal/commit/aaf9085a71280c5f9f0a2c45c8f01f7723015baf))
* release 5.0.0-alpha.1 ([f968b62](https://github.com/netlify/next-runtime-minimal/commit/f968b620ac8af22c04eab5c57d30fdbcf255b990))

## [5.0.0-alpha.0](https://github.com/netlify/next-runtime-minimal/compare/v5.0.0-alpha.0...v5.0.0-alpha.0) (2023-11-13)


### Bug Fixes

* requesting page router static assets ([#58](https://github.com/netlify/next-runtime-minimal/issues/58)) ([c893ad1](https://github.com/netlify/next-runtime-minimal/commit/c893ad17e31ce3912a20f8a22d476c2937a81a99))


### Miscellaneous Chores

* release 5.0.0-alpha.0 ([aaf9085](https://github.com/netlify/next-runtime-minimal/commit/aaf9085a71280c5f9f0a2c45c8f01f7723015baf))

## 5.0.0-alpha.0 (2023-11-13)

This is the first internal-only release of the new Next Runtime! It represents a big step forward in
making the runtime more reliable and easier to maintain by leaning on the framework more, using new
Netlify platform primitives and working with new Next.js public APIs such as custom cache handling
and standalone mode.

The features in this release finally allow us to run Next.js App Router sites, with full support for
the various rendering/routing/revalidating scenarios.

Note that we are currently working through some issues with Pages Router support, so please consider
this an App Router only release, with Pages Router support still to come. Similarly, this release
contains no edge runtime and hence middleware will run at the origin and not on the edge.

This is an alpha release, so please expect a variety of interesting edge-case bugs. It is not ready
for production use, but we are excited to share it and begin gathering feedback.

### Features

- **Standalone mode:** The Next Runtime now builds Next.js sites in standalone mode, which means the
  Next Runtime no longer needs to trace and package server files/dependencies and we can instead
  rely on the framework. In addition, it exposes a server entrypoint that allows us to handle
  requests in a more reliable way, meaning we are less exposed to changes in Next.js internals.
- **Cache handling:** We are making use of a new Next.js configuration parameter that allows us to
  specify a custom cache handler. This is a huge leap forward because it allows us to leverage
  Netlify's new `Cache-Control` primitives and retire the use of ODBs, which are no longer suitable
  for dealing with the advanced caching requirements of modern Next.js sites. The new Next Runtime
  forwards Next.js `Cache-Control` headers and specifically ensures that `stale-while-revalidate` is
  handled by our edge CDN and does not leak to the browser. In addition, the runtime sets
  appropriate `Vary` and `Cache-Tags` headers according to the Next.js response.
- **Blob storage** To support globally persistent static revalidation, the Next Runtime makes use of
  Netlify's new blob storage primitive. Page content and metadata is cached in the blob store,
  meaning that the same content version is available to all lambda invocations and can be
  automatically (TTL) or manually (on-demand) revalidated across all CDN nodes.
- **Functions API v2** The server handler utilizes the new Netlify Functions API, which means we are
  now receiving/returning a standard web Request/Response object and no longer need to bridge
  between a Lambda event and a Node event by standing up an HTTP server on each request. In
  addition, the new configuration API means we will no longer need to modify the Netlify TOML file
  and can avoid modifying any user code or Next.js build output for better DX.
