# Changelog

### [4.3.2](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.3.1...v4.3.2) (2022-04-04)


### Bug Fixes

* :bug: include terser bundle into netlify functions ([#1295](https://github.com/netlify/netlify-plugin-nextjs/issues/1295)) ([f29adf3](https://github.com/netlify/netlify-plugin-nextjs/commit/f29adf3ee1d4be8bf40e4695ca4ac1e970c9b1ad))

### [4.3.1](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.3.0...v4.3.1) (2022-03-28)


### Bug Fixes

* correctly find site root when using SSR with Nx ([#1281](https://github.com/netlify/netlify-plugin-nextjs/issues/1281)) ([3b26573](https://github.com/netlify/netlify-plugin-nextjs/commit/3b26573407c44a3f6405db776d9d37d993761c1c))

## [4.3.0](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.8...v4.3.0) (2022-03-23)


### Features

* allow skipping of middleware handling ([#1277](https://github.com/netlify/netlify-plugin-nextjs/issues/1277)) ([63070da](https://github.com/netlify/netlify-plugin-nextjs/commit/63070daaff4082a756af881a382c238c37d07aec))


### Bug Fixes

* **deps:** update dependency @vercel/node-bridge to v2.2.0 ([#1246](https://github.com/netlify/netlify-plugin-nextjs/issues/1246)) ([3637fff](https://github.com/netlify/netlify-plugin-nextjs/commit/3637fffce8550b012c8c9f35a0b9f3d1672e90a2))

### [4.2.8](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.7...v4.2.8) (2022-03-21)


### Bug Fixes

* add new /trace to HIDDEN_PATHS ([#1259](https://github.com/netlify/netlify-plugin-nextjs/issues/1259)) ([84345a8](https://github.com/netlify/netlify-plugin-nextjs/commit/84345a8c27f12bf1a07d1fc83cff9b9a398ee9db))
* chdir to site root ([#1265](https://github.com/netlify/netlify-plugin-nextjs/issues/1265)) ([8463bbc](https://github.com/netlify/netlify-plugin-nextjs/commit/8463bbcff483ddb6b14e73c6959092e2938cdef1))
* **deps:** update dependency @netlify/ipx to ^0.0.10 ([#1237](https://github.com/netlify/netlify-plugin-nextjs/issues/1237)) ([16e067d](https://github.com/netlify/netlify-plugin-nextjs/commit/16e067d7ef16da0479d83d09b188838e66946c34))
* use correct publishDir when building from CLI with cwd option ([#1264](https://github.com/netlify/netlify-plugin-nextjs/issues/1264)) ([e441c97](https://github.com/netlify/netlify-plugin-nextjs/commit/e441c970f3c7ce5c6e74a23cf55efe71d94c9027))

### [4.2.7](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.6...v4.2.7) (2022-02-18)


### Bug Fixes

* correctly cache when using `next export` ([#1223](https://github.com/netlify/netlify-plugin-nextjs/issues/1223)) ([a8030ca](https://github.com/netlify/netlify-plugin-nextjs/commit/a8030caee02f464dd2b962d2c12318f185260af9))
* **deps:** update dependency @netlify/functions to ^0.11.1 ([#1217](https://github.com/netlify/netlify-plugin-nextjs/issues/1217)) ([e17892b](https://github.com/netlify/netlify-plugin-nextjs/commit/e17892bf1be7aa75822c6295955dbd250cb14197))
* **deps:** update dependency @netlify/functions to v1 ([#1219](https://github.com/netlify/netlify-plugin-nextjs/issues/1219)) ([af841cd](https://github.com/netlify/netlify-plugin-nextjs/commit/af841cd6d22a26d67d2d6f5328d6825c68dd22f5))

### [4.2.6](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.5...v4.2.6) (2022-02-14)


### Bug Fixes

* prepend basePath to static file URLs ([#1213](https://github.com/netlify/netlify-plugin-nextjs/issues/1213)) ([8236b38](https://github.com/netlify/netlify-plugin-nextjs/commit/8236b38a5595abd38eec33fbe0a3aa112ded19d9))

### [4.2.5](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.4...v4.2.5) (2022-02-07)


### Bug Fixes

* remove confusing error log ([#1199](https://github.com/netlify/netlify-plugin-nextjs/issues/1199)) ([7974849](https://github.com/netlify/netlify-plugin-nextjs/commit/7974849396a342614119cbe77e8933fdc826151e))

### [4.2.4](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.3...v4.2.4) (2022-02-03)


### Bug Fixes

* correctly disable ISR disk flushing ([#1190](https://github.com/netlify/netlify-plugin-nextjs/issues/1190)) ([e8067bf](https://github.com/netlify/netlify-plugin-nextjs/commit/e8067bf13ec94fac80ca6ce495a32249dcd5130c))

### [4.2.3](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.2...v4.2.3) (2022-02-02)


### Bug Fixes

* don't use ODB for routes that match middleware ([#1171](https://github.com/netlify/netlify-plugin-nextjs/issues/1171)) ([bbcdfbd](https://github.com/netlify/netlify-plugin-nextjs/commit/bbcdfbdf4062a044e6e87429119ee4ba3ac19bc0))

### [4.2.2](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.1...v4.2.2) (2022-01-31)


### Bug Fixes

* **deps:** update dependency @netlify/ipx to ^0.0.9 ([#1181](https://github.com/netlify/netlify-plugin-nextjs/issues/1181)) ([2e55a9e](https://github.com/netlify/netlify-plugin-nextjs/commit/2e55a9efc2c0d7ccffe3757c7ef915219b1598e8))

### [4.2.1](https://github.com/netlify/netlify-plugin-nextjs/compare/v4.2.0...v4.2.1) (2022-01-24)


### Bug Fixes

* **deps:** update dependency @netlify/functions to ^0.11.0 ([#1146](https://github.com/netlify/netlify-plugin-nextjs/issues/1146)) ([4da630b](https://github.com/netlify/netlify-plugin-nextjs/commit/4da630bc6596f790cb45ea0a4cd82d235ff1d3b1))
* **deps:** update dependency core-js to v3.20.3 ([#1155](https://github.com/netlify/netlify-plugin-nextjs/issues/1155)) ([043ad36](https://github.com/netlify/netlify-plugin-nextjs/commit/043ad36e18cc720c48dc4a5c29659c79a8982abb))
* provide hostname and port to server ([#1149](https://github.com/netlify/netlify-plugin-nextjs/issues/1149)) ([02053fd](https://github.com/netlify/netlify-plugin-nextjs/commit/02053fdce786e26a5a6c60a9e38b9e05fd2ac0d3))

## [4.2.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.1.3...v4.2.0) (2022-01-17)


### Features

* add request logging ([#1127](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1127)) ([010e86c](https://www.github.com/netlify/netlify-plugin-nextjs/commit/010e86c7c7513df8676dd8b3c747dcfa81fbc09e))

### [4.1.3](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.1.2...v4.1.3) (2022-01-13)


### Bug Fixes

* handle `routes-manifest`s without `staticRoutes` defined ([#1120](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1120)) ([96f3ccb](https://www.github.com/netlify/netlify-plugin-nextjs/commit/96f3ccb977e66dcd2b1a7911df24357501d18435))

### [4.1.2](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.1.1...v4.1.2) (2022-01-11)


### Bug Fixes

* add specific rewrites for all SSR routes ([#1105](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1105)) ([6fd7bcc](https://www.github.com/netlify/netlify-plugin-nextjs/commit/6fd7bcc99aacf447559de46f60de6d8cb33e7a59))
* **deps:** update dependency core-js to v3.20.2 ([#1095](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1095)) ([41966ca](https://www.github.com/netlify/netlify-plugin-nextjs/commit/41966cac3b17035f6b008ddbf66ad1b3e6920e07))

### [4.1.1](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.1.0...v4.1.1) (2021-12-21)


### Bug Fixes

* fix bug that caused ISR pages to sometimes serve first built version ([#1051](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1051)) ([62660b2](https://www.github.com/netlify/netlify-plugin-nextjs/commit/62660b2da56457a5993985b05a7cdfd73e698bba))
* force React to use production env ([#1056](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1056)) ([eca0bee](https://www.github.com/netlify/netlify-plugin-nextjs/commit/eca0bee044ae44193eae7c9864153ae9b627b0ac))

## [4.1.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0...v4.1.0) (2021-12-17)


### Features

* add support for use with `next export` ([#1012](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1012)) ([76edc53](https://www.github.com/netlify/netlify-plugin-nextjs/commit/76edc5324d89adfad8c43a654ecec7719861e2b4))


### Bug Fixes

* prevent infinite loop when `/` is ISR ([#1020](https://www.github.com/netlify/netlify-plugin-nextjs/issues/1020)) ([55b18e6](https://www.github.com/netlify/netlify-plugin-nextjs/commit/55b18e6e4ea9424e896b860502d645513112c4f3))

## [4.0.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-rc.2...v4.0.0) (2021-12-14)

This is a full rewrite of the Essential Next.js plugin, with a new architecture that gives greater compatibility and
stability.

### What's new

- Full support for
  [incremental static regeneration (ISR)](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/isr.md).
- Full support for
  [Next.js rewrites, redirects and headers](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/redirects-rewrites.md).
- Beta support for [Next 12 Middleware](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/middleware.md)
- Faster builds and deploys. Instead of generating one function per route, there are just three functions per site and a
  much smaller list of rewrites.
- Full support for Netlify's new [persistent On-Demand Builders](https://ntl.fyi/odb). Return `fallback: "blocking"`
  from `getStaticPaths` and your rendering will be deferred until the first page load, then persisted globally.
- A new image server for next/image, built on Nuxt's [ipx](https://github.com/unjs/ipx/). This is a high-performance,
  framework-agnostic image server based on sharp. This implementation uses On-Demand Builders to persist transformed
  images globally. Improved source image caching reduces time-to-first-byte for new transforms.
- Simplified configuration. You no longer need to set any Netlify-specific configuration options. For example, in a
  monorepo all you need to do is set `publish` to point to your `.next` directory and you can build the site in any way
  you like.
- Removes requirement for the `target` to be set to `serverless`, which is deprecated in Next 12.
- Bundling now uses Next.js's own node-file-trace, giving more predictable results and smaller uploads.

### Breaking changes

The `publish` directory should point to the site's `.next` directory or `distDir` if set, rather than `out` as in
previous versions of the plugin.

### Migration guide

Change the `publish` directory to `.next`:

```toml
[build]
publish = ".next"

```

If you previously set these values, they're no longer needed and can be removed:

- `target: "serverless"` in your `next.config.js`
- `distDir` in your `next.config.js`
- `node_bundler = "esbuild"` in `netlify.toml`
- `external_node_modules` in `netlify.toml`

If you currently use redirects or rewrites on your site, see
[the Rewrites and Redirects guide](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/redirects-rewrites.md)
for information on changes to how they are handled in this version.

If you want to use Next 12's beta Middleware feature, this will mostly work as expected but please
[read the docs on some caveats and workarounds](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/middleware.md)
that are currently needed.

## [4.0.0-rc.1](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-rc.0...v4.0.0-rc.1) (2021-12-07)

### Features

- enable TTL for all sites ([#916](https://www.github.com/netlify/netlify-plugin-nextjs/issues/916))
  ([152cf03](https://www.github.com/netlify/netlify-plugin-nextjs/commit/152cf03b29fe794322f52e0cb4afba79c0b70da5))

### Bug Fixes

- bypass preview for static files ([#918](https://www.github.com/netlify/netlify-plugin-nextjs/issues/918))
  ([ecb3cc8](https://www.github.com/netlify/netlify-plugin-nextjs/commit/ecb3cc8491a6f24f75d8072f0a5e4a49b466146a))
- work around a bug that caused a full response to be sent for images, even if the etag matched
- **deps:** update dependency @netlify/ipx to ^0.0.8
  ([#902](https://www.github.com/netlify/netlify-plugin-nextjs/issues/902))
  ([25f375f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/25f375fdff074e6aabd6a6d5b66433891f8af9dc))

## [4.0.0-rc.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.13...v4.0.0-rc.0) (2021-12-06)

### Bug Fixes

- copy public directory output instead of input when using Nx
  ([#856](https://www.github.com/netlify/netlify-plugin-nextjs/issues/856))
  ([d959f82](https://www.github.com/netlify/netlify-plugin-nextjs/commit/d959f82e622dfb2c9e2b7139ff39e8e7eed35f5c))
- correct root redirect when trailingSlash = false
  ([#879](https://www.github.com/netlify/netlify-plugin-nextjs/issues/879))
  ([3c6b10b](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3c6b10bd38abae9a7b4e952ef9e88c254acef701))

## [4.0.0-beta.13](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.12...v4.0.0-beta.13) (2021-12-02)

### Bug Fixes

- correct handling of data route JSON files ([#864](https://www.github.com/netlify/netlify-plugin-nextjs/issues/864))
  ([adea889](https://www.github.com/netlify/netlify-plugin-nextjs/commit/adea889085be758a47a01503b0501569ee27bc6a))
- move locale detection to netlify redirects ([#861](https://www.github.com/netlify/netlify-plugin-nextjs/issues/861))
  ([964637b](https://www.github.com/netlify/netlify-plugin-nextjs/commit/964637beb6e71ecac750f84858676cd4d980c5b8))

## [4.0.0-beta.12](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.11...v4.0.0-beta.12) (2021-11-30)

### Features

- add experimental support for TTL ([#833](https://www.github.com/netlify/netlify-plugin-nextjs/issues/833))
  ([14ca14a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/14ca14a9fabc7a1fc3574e9cd9b53529f19a44c6))
- add support for Next env vars ([#842](https://www.github.com/netlify/netlify-plugin-nextjs/issues/842))
  ([24fd88a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/24fd88a843767a7df9633f6c18d7ee7fc9724279))

### Miscellaneous Chores

- **deps:** update dependency @netlify/build to v19
  ([#840](https://www.github.com/netlify/netlify-plugin-nextjs/issues/840))
  ([d927524](https://www.github.com/netlify/netlify-plugin-nextjs/commit/d927524219941fea3206abb15b2d26d6325d2921))

## [4.0.0-beta.11](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.10...v4.0.0-beta.11) (2021-11-24)

### Bug Fixes

- handle missing i18n object ([#837](https://www.github.com/netlify/netlify-plugin-nextjs/issues/837))
  ([3b6d293](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3b6d2938f0893fd4376a3f918d6f3ff81c720248))

## [4.0.0-beta.10](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.9...v4.0.0-beta.10) (2021-11-24)

### Bug Fixes

- replace node-fetch with builtin ([#834](https://www.github.com/netlify/netlify-plugin-nextjs/issues/834))
  ([6ff3100](https://www.github.com/netlify/netlify-plugin-nextjs/commit/6ff31005e87262a26c47e3fe1d6fe14d990e5554))
- correct redirect priority and correctly handle ISR pages assets
  ([#826](https://www.github.com/netlify/netlify-plugin-nextjs/issues/826))
  ([6b61643](https://www.github.com/netlify/netlify-plugin-nextjs/commit/6b61643a7d8b3f5a7c10642d250a665dfc25037c))
- **deps:** update dependency @netlify/functions to ^0.10.0
  ([#830](https://www.github.com/netlify/netlify-plugin-nextjs/issues/830))
  ([3256839](https://www.github.com/netlify/netlify-plugin-nextjs/commit/32568394b2022edc14911809ebbfbff81ac26da6))
- don't move files to the CDN if they match redirect/rewrite rules
  ([#832](https://www.github.com/netlify/netlify-plugin-nextjs/issues/832))
  ([9e3dd0e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/9e3dd0ea359ccaa17ed72644faa80aefd1cf9835))

## [4.0.0-beta.9](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.8...v4.0.0-beta.9) (2021-11-19)

### Bug Fixes

- gracefully handle mssing middleware ([#821](https://www.github.com/netlify/netlify-plugin-nextjs/issues/821))
  ([4cee35d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/4cee35d62c918fb6f893d740bc0c382028b43965))

## [4.0.0-beta.8](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.7...v4.0.0-beta.8) (2021-11-19)

### Features

- don't move files to CDN if they match middleware
  ([#812](https://www.github.com/netlify/netlify-plugin-nextjs/issues/812))
  ([615c97a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/615c97ab63350430d520845567a5235a40512873))
- move static pages by default ([#816](https://www.github.com/netlify/netlify-plugin-nextjs/issues/816))
  ([12ce69e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/12ce69ef817c8125e82f367993b62c3631af2e30))

## [4.0.0-beta.7](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.6...v4.0.0-beta.7) (2021-11-17)

### Features

- add docs on middleware ([#795](https://www.github.com/netlify/netlify-plugin-nextjs/issues/795))
  ([3b4a8c4](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3b4a8c40e6300c0104c557bf7379859afe2be682))
- log warning if old functions exist ([#801](https://www.github.com/netlify/netlify-plugin-nextjs/issues/801))
  ([01faf58](https://www.github.com/netlify/netlify-plugin-nextjs/commit/01faf5853cd5e536b7549e627e2e65bcd6c4018f))

### Bug Fixes

- **deps:** update dependency @netlify/functions to ^0.9.0
  ([#807](https://www.github.com/netlify/netlify-plugin-nextjs/issues/807))
  ([3deec1d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3deec1d7f32e1b77b0812b8f1e6da30976e5448c))
- ensure path is encoded ([#800](https://www.github.com/netlify/netlify-plugin-nextjs/issues/800))
  ([b0f666e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/b0f666ee8aad046503f0d562d0c3e4ac4275b945))
- use forced catchall for preview mode ([#793](https://www.github.com/netlify/netlify-plugin-nextjs/issues/793))
  ([fd7130f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/fd7130f4a15f51e0785cdd9515faeb10cffb67a5))

### Miscellaneous Chores

- add docs on rewrites and redirects ([#767](https://www.github.com/netlify/netlify-plugin-nextjs/issues/767))
  ([b32a08c](https://www.github.com/netlify/netlify-plugin-nextjs/commit/b32a08c01a8e440d2c5a570c50128fdc37cf89a8))

## [4.0.0-beta.6](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.5...v4.0.0-beta.6) (2021-11-08)

### Bug Fixes

- handle static file glob on Windows ([#778](https://www.github.com/netlify/netlify-plugin-nextjs/issues/778))
  ([1cc222a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/1cc222a866c2bb410965a2867984005737792fb3))
- use glob to select files to move ([#768](https://www.github.com/netlify/netlify-plugin-nextjs/issues/768))
  ([faeb703](https://www.github.com/netlify/netlify-plugin-nextjs/commit/faeb7033296a43cee7a4494298d0df4f7e78bbd3))

## [4.0.0-beta.5](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.4...v4.0.0-beta.5) (2021-11-03)

### Bug Fixes

- add missing middleware runtime file ([#762](https://www.github.com/netlify/netlify-plugin-nextjs/issues/762))
  ([83378b4](https://www.github.com/netlify/netlify-plugin-nextjs/commit/83378b4f53467284016c2ca7b3b121ca0079a1cc))
- **deps:** update dependency node-fetch to v2.6.6
  ([#758](https://www.github.com/netlify/netlify-plugin-nextjs/issues/758))
  ([759915b](https://www.github.com/netlify/netlify-plugin-nextjs/commit/759915bf98f6963cbf35619c28a719fecdd50ea7))
- don't force rewrite in preview mode ([#761](https://www.github.com/netlify/netlify-plugin-nextjs/issues/761))
  ([c88a504](https://www.github.com/netlify/netlify-plugin-nextjs/commit/c88a504e36883a644516e6b7afc8bbce00a68858))

## [4.0.0-beta.4](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.3...v4.0.0-beta.4) (2021-10-27)

### Bug Fixes

- correctly resolve zip path ([#744](https://www.github.com/netlify/netlify-plugin-nextjs/issues/744))
  ([68b5662](https://www.github.com/netlify/netlify-plugin-nextjs/commit/68b56620946364f8bd9b90896c1a9c0cba78d7a7))
- **deps:** update dependency @netlify/functions to ^0.8.0
  ([#747](https://www.github.com/netlify/netlify-plugin-nextjs/issues/747))
  ([2c87e30](https://www.github.com/netlify/netlify-plugin-nextjs/commit/2c87e307568a6547432bf6995b9427077561c74b))
- exclude electron by default ([#746](https://www.github.com/netlify/netlify-plugin-nextjs/issues/746))
  ([887b90a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/887b90a8f6cc63f3e44c6bc85888eb4d609d9ee4))

## [4.0.0-beta.3](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.2...v4.0.0-beta.3) (2021-10-26)

### Features

- support moving static pages out of function bundle
  ([#728](https://www.github.com/netlify/netlify-plugin-nextjs/issues/728))
  ([3da9c77](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3da9c77d8a021c30253c42eeab69c8feed5e79f5))
- warn if zip is too large, and log the largest files
  ([#730](https://www.github.com/netlify/netlify-plugin-nextjs/issues/730))
  ([9989c0a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/9989c0a46decc3370b7fb102774360e3268f571f))

### Bug Fixes

- disable serverless targets ([#739](https://www.github.com/netlify/netlify-plugin-nextjs/issues/739))
  ([01fa113](https://www.github.com/netlify/netlify-plugin-nextjs/commit/01fa113664333db182424607ff4c2172d6fcfd59))
- ensure stale-while-revalidate headers are not sent
  ([#737](https://www.github.com/netlify/netlify-plugin-nextjs/issues/737))
  ([ef2da0d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/ef2da0d8355fa7b60c1f451f19af7d2eb61ee326))
- typo in readme ([#731](https://www.github.com/netlify/netlify-plugin-nextjs/issues/731))
  ([bfc016f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/bfc016f222d7e3e778fc20efa63d0e33dcc011e9))
- use nft for ipx bundle ([#725](https://www.github.com/netlify/netlify-plugin-nextjs/issues/725))
  ([0321f68](https://www.github.com/netlify/netlify-plugin-nextjs/commit/0321f68c301cae351704d0180dc17201141ddc94))
- use platform-agnostic paths, and add test to be sure
  ([#736](https://www.github.com/netlify/netlify-plugin-nextjs/issues/736))
  ([d448b11](https://www.github.com/netlify/netlify-plugin-nextjs/commit/d448b11d3d1730524c9d11ec749d2970f09ba7ea))

## [4.0.0-beta.2](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.1...v4.0.0-beta.2) (2021-10-19)

### Features

- Enable persistent builders by default ([#716](https://www.github.com/netlify/netlify-plugin-nextjs/issues/716))
  ([de07dc2](https://www.github.com/netlify/netlify-plugin-nextjs/commit/de07dc2e21c40feced296b4acb1bf2b03fe97485))

### Bug Fixes

- correctly exclude files ([#720](https://www.github.com/netlify/netlify-plugin-nextjs/issues/720))
  ([efba43e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/efba43ec687f01094eb31af0b2baab36bee59ffc))
- pass query string to handler ([#719](https://www.github.com/netlify/netlify-plugin-nextjs/issues/719))
  ([ff09cae](https://www.github.com/netlify/netlify-plugin-nextjs/commit/ff09cae3940e6b3c16c0ce718664051f2c6d9537))

## [4.0.0-beta.1](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.0...v4.0.0-beta.1) (2021-10-15)

### Bug Fixes

- pass correct path to odb ([#702](https://www.github.com/netlify/netlify-plugin-nextjs/issues/702))
  ([7c5a8ae](https://www.github.com/netlify/netlify-plugin-nextjs/commit/7c5a8ae9def9d23a6e9a05a8f52ef22181dd7572))

### Miscellaneous Chores

- update min build version ([#704](https://www.github.com/netlify/netlify-plugin-nextjs/issues/704))
  ([3e1930f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3e1930f5ea62a7332bdace7e9a95b68dc32ab954))

## [4.0.0-beta.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v3.9.1...v4.0.0-beta.0) (2021-10-15)

A complete rewrite of the Essential Next plugin. See the README for details and migration instructions
