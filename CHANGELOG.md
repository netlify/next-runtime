# Changelog

## [3.1.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v3.0.3...v3.1.0) (2021-04-11)


### Features

* unstableNetlifyFunctionsSupport.includeDirs configuration ([#182](https://www.github.com/netlify/netlify-plugin-nextjs/issues/182)) ([2953faa](https://www.github.com/netlify/netlify-plugin-nextjs/commit/2953faa67ce10832b5135fb4cbeb46f181222d9d))


### Bug Fixes

* **deps:** update dependency find-up to v5 ([#138](https://www.github.com/netlify/netlify-plugin-nextjs/issues/138)) ([757ba52](https://www.github.com/netlify/netlify-plugin-nextjs/commit/757ba52b041f0cc31fe7749a200dbcfa9e1f8551))
* **deps:** update dependency semver to v7.3.5 ([5a92dd2](https://www.github.com/netlify/netlify-plugin-nextjs/commit/5a92dd22a45bc3037f3b966cc0cf4eeee52936d6))
* fix minimum Next.js version ([54c2b1e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/54c2b1e0f5da908106abdad3716abb15b6da168d))

## 3.0.3 (2021-03-12)

### Bug fixes

- Fix memoization when retrieving `next.config.js` ([#128](https://github.com/netlify/netlify-plugin-nextjs/pull/128))

## 3.0.2 (2021-03-11)

### Bug fixes

- Fix missing `find-cache-dir` ([#127](https://github.com/netlify/netlify-plugin-nextjs/pull/127))

## 3.0.1 (2021-03-11)

### Bug fixes

- Fix errors while loading `next.config.js` ([#124](https://github.com/netlify/netlify-plugin-nextjs/pull/124))
- Fix errors when `next` is not installed ([#123](https://github.com/netlify/netlify-plugin-nextjs/pull/123))
- Fix missing `await` keyword ([#122](https://github.com/netlify/netlify-plugin-nextjs/pull/122))

### Chore

- Reduce the npm package size ([#109](https://github.com/netlify/netlify-plugin-nextjs/pull/109))

## 3.0.0 (2021-03-08)

- feat: merge `next-on-netlify` into `@netlify/plugin-nextjs`

  This improves our ability to maintain the plugin, reduces confusion about how to configure Next.js support for Netlify builds, and prepares the plugin for something we're pretty dang excited about: automatic installation for new Next.js projects!

> **NOTE: There are no breaking changes for existing plugin users.** This is a major release because we're bringing an external package into the plugin _and_ turning on automatic installation for new Next.js projects on Netlify. This doesn't break anything, but it's a big enough change that we wanted to treat it as a major release.

- fix: next 10.0.8 changes loadConfig to be async ([#105](https://github.com/netlify/netlify-plugin-nextjs/pull/105))

### Migrating from v2 to v3

If you've installed this plugin via Netlify's UI, no action is necessary. The upgrade is automatic.

If you've installed this plugin manually in your `netlify.toml`, you can upgrade two ways:

1. Manually update to the latest version using `npm i @netlify/plugin-nextjs@latest`.
2. If you prefer to automatically get updates, remove this plugin from your project and `netlify.toml`, then [install the plugin using the Netlify UI](http://app.netlify.com/plugins/@netlify/plugin-nextjs/install).

### Migrating from the original `next-on-netlify` package

As part of the 3.0.0 release, `next-on-netlify` has been deprecated and merged into the Essential Next.js Build Plugin. If your site is using the `next-on-netlify` package, you'll need to switch over to the plugin to get future updates.

For instructions on migrating from `next-on-netlify` to the Essential Next.js Build Plugin, please see the [migration guide on the `next-on-netlify` repo](https://github.com/netlify/next-on-netlify/blob/main/MIGRATING.md).

## 2.0.1 (2021-02-17)

- fail build if plugin cant load next.config.js ([#99](https://github.com/netlify/netlify-plugin-nextjs/pull/99))
- chore: decrease package size ([#101](https://github.com/netlify/netlify-plugin-nextjs/pull/101))
- remove Next as a peer dependency ([#96](https://github.com/netlify/netlify-plugin-nextjs/pull/96))
- update failure points in plugin to do nothing instead ([#94](https://github.com/netlify/netlify-plugin-nextjs/pull/94))

## 2.0.0 (2021-02-04)

- feature: use new default functions directory ([#87](https://github.com/netlify/netlify-plugin-nextjs/pull/87))

## 1.1.2 (2021-03-16)

- backport `update failure points in plugin to do nothing instead` to v1 ([#146](https://github.com/netlify/netlify-plugin-nextjs/pull/146))

## 1.1.1 (2021-02-02)

- upgrade NoN to [2.8.7](https://github.com/netlify/next-on-netlify/releases/tag/v2.8.7)

## 1.1.0 (2021-01-27)

- upgrade NoN to [2.8.6](https://github.com/netlify/next-on-netlify/releases/tag/v2.8.6)

## 1.0.9 (2021-01-26)

- upgrade NoN to [2.8.5](https://github.com/netlify/next-on-netlify/releases/tag/v2.8.5)

## 1.0.8 (2021-01-18)

- upgrade NoN to 2.8.4 (fixes file tracking for nonexistent dirs) ([#86](https://github.com/netlify/netlify-plugin-nextjs/pull/86))

## 1.0.7 (2021-01-18)

- upgrade NoN to 2.8.3 (reverts next/image support)

## 1.0.6 (2021-01-16)

- upgrade NoN to 2.8.2; explain CLI usage workflow in README; add jimp ([#83](https://github.com/netlify/netlify-plugin-nextjs/pull/83))
- update next.config.js target error message to be more clear ([78a0986](https://github.com/netlify/netlify-plugin-nextjs/commit/78a0986548af877678834f20302b2b2ee88063e4))

## 1.0.5 (2021-01-07)

- upgrade next-on-netlify version to 2.7.2 ([#77](https://github.com/netlify/netlify-plugin-nextjs/pull/77))

## 1.0.4 (2021-01-06)

- upgrade next-on-netlify version to 2.7.1 ([#76](https://github.com/netlify/netlify-plugin-nextjs/pull/76))

## 1.0.3 (2020-12-21)

- Fix: use site's Next.js version ([#73](https://github.com/netlify/netlify-plugin-nextjs/pull/73))
- Fix: next export unused script mistakenly failed builds ([#72](https://github.com/netlify/netlify-plugin-nextjs/pull/72))
- Miscellaneous testing
- Miscellaneous README changes

## 1.0.2 (2020-11-10)

- Fix React peer dependency ([#60](https://github.com/netlify/netlify-plugin-nextjs/pull/60))

## 1.0.1 (2020-11-19)

- Fix: require('next') until plugin pre-installs are fixed internally ([#57](https://github.com/netlify/netlify-plugin-nextjs/pull/57))

## 1.0.0 (2020-11-18)

- Beta release of zero-config and UI-one-click plugin install
