# Changelog

## [1.4.8](https://github.com/netlify/next-runtime/compare/next-v1.4.7...next-v1.4.8) (2023-06-26)


### Bug Fixes

* Return MiddlewareResponse obj for rewrite ([#2159](https://github.com/netlify/next-runtime/issues/2159)) ([0eda10b](https://github.com/netlify/next-runtime/commit/0eda10b5d978c20b2f888d749b57b932c455c6e0))

## [1.4.7](https://github.com/netlify/next-runtime/compare/next-v1.4.6...next-v1.4.7) (2023-06-16)


### Bug Fixes

* ensures compatibility with Next.js 13.4 (support for some features still en-route) ([9f85472](https://github.com/netlify/next-runtime/commit/9f8547260f654ad89a6412c6deaeb096ffd56671))
* uses pre-bundled React modules for App Router paths ([9f85472](https://github.com/netlify/next-runtime/commit/9f8547260f654ad89a6412c6deaeb096ffd56671))

## [1.4.6](https://github.com/netlify/next-runtime/compare/next-v1.4.5...next-v1.4.6) (2023-05-08)


### Bug Fixes

* update next to 13.3.0 & ensure compatibility ([#2056](https://github.com/netlify/next-runtime/issues/2056)) ([75ed977](https://github.com/netlify/next-runtime/commit/75ed977553edc36ac018191bee5bba08b800f722))

## [1.4.5](https://github.com/netlify/next-runtime/compare/next-v1.4.4...next-v1.4.5) (2023-04-10)


### Bug Fixes

* support setting cookies from MiddlewareResponse ([#2027](https://github.com/netlify/next-runtime/issues/2027)) ([a630ab4](https://github.com/netlify/next-runtime/commit/a630ab41e8a4d0f04e8de4b19a8886705a6b0fe8))

## [1.4.4](https://github.com/netlify/next-runtime/compare/next-v1.4.3...next-v1.4.4) (2023-02-06)


### Bug Fixes

* add `AsyncLocalStorage` to `globalThis` ([#1907](https://github.com/netlify/next-runtime/issues/1907)) ([1ec8203](https://github.com/netlify/next-runtime/commit/1ec820322fea66fa4027a353d5ba562074c90509))

## [1.4.3](https://github.com/netlify/next-runtime/compare/next-v1.4.2...next-v1.4.3) (2022-12-19)


### Bug Fixes

* support appDir ([#1638](https://github.com/netlify/next-runtime/issues/1638)) ([a5b8047](https://github.com/netlify/next-runtime/commit/a5b80475a89f5ab2266059ad2e96c8786ff41421))

## [1.4.2](https://github.com/netlify/next-runtime/compare/next-v1.4.1...next-v1.4.2) (2022-12-05)


### Bug Fixes

* fix Invalid URL error when using uppercase i18n url ([#1812](https://github.com/netlify/next-runtime/issues/1812)) ([63e060d](https://github.com/netlify/next-runtime/commit/63e060df7d3851c5dafae60d4790c2f34d47ed80))

## [1.4.1](https://github.com/netlify/next-runtime/compare/next-v1.4.0...next-v1.4.1) (2022-11-21)


### Bug Fixes

* add longitude, latitude, and timezone to RequestData.geo ([#1777](https://github.com/netlify/next-runtime/issues/1777)) ([3f35549](https://github.com/netlify/next-runtime/commit/3f355497f02726a54aa0b5f391c3e9684d45228f))

## [1.4.0](https://github.com/netlify/next-runtime/compare/next-v1.3.1...next-v1.4.0) (2022-10-25)


### Features

* support Next 13 ([#1714](https://github.com/netlify/next-runtime/issues/1714)) ([efcb47a](https://github.com/netlify/next-runtime/commit/efcb47a84697edd313f3d8643ebcc48f3bde11e3))

## [1.3.1](https://github.com/netlify/next-runtime/compare/next-v1.3.0...next-v1.3.1) (2022-09-28)


### Bug Fixes

* add missing data to middleware request object ([#1634](https://github.com/netlify/next-runtime/issues/1634)) ([0c05726](https://github.com/netlify/next-runtime/commit/0c057265b9297ceb38d49c675159cc50b9df23a3))

## [1.3.0](https://github.com/netlify/next-runtime/compare/next-v1.2.0...next-v1.3.0) (2022-09-09)


### Features

* add support for Next 12.3 middleware matchers ([#1612](https://github.com/netlify/next-runtime/issues/1612)) ([fd88b98](https://github.com/netlify/next-runtime/commit/fd88b9829f93953a06ba0d1269ac8ba5f51f6874))

## [1.2.0](https://github.com/netlify/next-runtime/compare/next-v1.1.1...next-v1.2.0) (2022-09-08)


### Features

* create edge function demo ([#1586](https://github.com/netlify/next-runtime/issues/1586)) ([43a60c8](https://github.com/netlify/next-runtime/commit/43a60c88260e897d3b6b49f9f05442151da36644))

## [1.1.1](https://github.com/netlify/next-runtime/compare/next-v1.1.0...next-v1.1.1) (2022-08-31)

### Bug Fixes

- remove Next.js as a peer dependency ([#1584](https://github.com/netlify/next-runtime/issues/1584))
  ([6be4dc0](https://github.com/netlify/next-runtime/commit/6be4dc08e5339efb84e180e9ea02ce0bc6efe5b5))

## [1.1.0](https://github.com/netlify/next-runtime/compare/next-v1.0.0...next-v1.1.0) (2022-08-22)

### Features

- add edge middleware support to `ntl dev` ([#1546](https://github.com/netlify/next-runtime/issues/1546))
  ([b208ff4](https://github.com/netlify/next-runtime/commit/b208ff463499565d86cc15747b95895b3da18e55))
