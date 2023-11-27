# Changelog

## [5.0.0-alpha.25](https://github.com/netlify/next-runtime-minimal/compare/v5.0.0-alpha.2...v5.0.0-alpha.25) (2023-11-27)


### Features

* cache tags & on-demand Revalidation for pages ([#50](https://github.com/netlify/next-runtime-minimal/issues/50)) ([a6f3ce2](https://github.com/netlify/next-runtime-minimal/commit/a6f3ce2652889fca5236c26b88d72932bf2315a6))
* symlink for speed and to avoid clobbering user files ([#56](https://github.com/netlify/next-runtime-minimal/issues/56)) ([2576f81](https://github.com/netlify/next-runtime-minimal/commit/2576f8108184bc982950627b7667de7f5a202718))


### Bug Fixes

* disable downloading canary swc binaries ([#81](https://github.com/netlify/next-runtime-minimal/issues/81)) ([8f3799c](https://github.com/netlify/next-runtime-minimal/commit/8f3799c2c534db9defb18ad82ae669781b289223))
* fix patching the fs by doing a shallow clone of fs/promises module to avoid infinite loop ([#73](https://github.com/netlify/next-runtime-minimal/issues/73)) ([80b5ea9](https://github.com/netlify/next-runtime-minimal/commit/80b5ea9d1f47d9bccb0eec421846e2e2ee3b0f7f))
* fixes a module interop issue ([#67](https://github.com/netlify/next-runtime-minimal/issues/67)) ([57b8678](https://github.com/netlify/next-runtime-minimal/commit/57b8678349dd6a3348837b8ac28dd04f659d9a7f))
* fixes an issue where the nft tracing was not picking up the runtime node_modules ([#74](https://github.com/netlify/next-runtime-minimal/issues/74)) ([fe68c74](https://github.com/netlify/next-runtime-minimal/commit/fe68c744e71aed11290ec636f0b41bb72e83f835))
* fixes an issue where the static pages could not be retrieved from the blob store ([#79](https://github.com/netlify/next-runtime-minimal/issues/79)) ([e18de13](https://github.com/netlify/next-runtime-minimal/commit/e18de1375ba4b60eaa562aed29a679764b25843e))
* fixes the package structure ([#66](https://github.com/netlify/next-runtime-minimal/issues/66)) ([b10dad6](https://github.com/netlify/next-runtime-minimal/commit/b10dad61c09179ba879f15ba0a2878564beb1054))
* handle dependency paths for packaged module ([a81658c](https://github.com/netlify/next-runtime-minimal/commit/a81658c75e4a5914c96dacba1fd6c0a557259e09))
* resolution issue ([#72](https://github.com/netlify/next-runtime-minimal/issues/72)) ([f56c28c](https://github.com/netlify/next-runtime-minimal/commit/f56c28c86b3d5f98240a9bd018251b3e900c1beb))
* resolving the paths correctly when the next-runtime is used from source ([#77](https://github.com/netlify/next-runtime-minimal/issues/77)) ([fcd57d1](https://github.com/netlify/next-runtime-minimal/commit/fcd57d1495034566763d769ab6576aed5307ec85))
* revert symlinks to cp due to CLI issues ([#70](https://github.com/netlify/next-runtime-minimal/issues/70)) ([85a50d4](https://github.com/netlify/next-runtime-minimal/commit/85a50d46cc87306642acefc677bc48bfafeb142d))
* temporary workaround for CDN compression bug ([#80](https://github.com/netlify/next-runtime-minimal/issues/80)) ([6b9fa33](https://github.com/netlify/next-runtime-minimal/commit/6b9fa3374fe3995f036560321a232a77ff4d858e))
* Update included files within package.json ([#63](https://github.com/netlify/next-runtime-minimal/issues/63)) ([ec7c681](https://github.com/netlify/next-runtime-minimal/commit/ec7c681c0d825ed38db80f8370fc86011db2ab2a))


### Miscellaneous Chores

* release 5.0.0-alpha.25 ([7088065](https://github.com/netlify/next-runtime-minimal/commit/708806592b3d60da4b7433575293914d5a87596c))

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
