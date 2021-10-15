# Changelog

## [3.10.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v3.9.1...v3.10.0) (2021-10-15)


### Features

* `basePath` support ([#18](https://www.github.com/netlify/netlify-plugin-nextjs/issues/18)) ([f7b0c98](https://www.github.com/netlify/netlify-plugin-nextjs/commit/f7b0c987c953d93215826a3a3fef7e8ea9575e06))
* add support for persistent builders ([#699](https://www.github.com/netlify/netlify-plugin-nextjs/issues/699)) ([c439a26](https://www.github.com/netlify/netlify-plugin-nextjs/commit/c439a26177a7b121facf86d704ccf8d975c7e86f))
* build caching ([9f3e5ef](https://www.github.com/netlify/netlify-plugin-nextjs/commit/9f3e5ef9339427406ecb4f8ce875c6a78764a9d1))
* distDir, resolveNextModule, prettier configs ([59ab0ed](https://www.github.com/netlify/netlify-plugin-nextjs/commit/59ab0edf35b294fe8e59f212517a144094286ccf))
* don't force target ([#10](https://www.github.com/netlify/netlify-plugin-nextjs/issues/10)) ([e140d44](https://www.github.com/netlify/netlify-plugin-nextjs/commit/e140d443e5ff13838463d74a087086db759d895b))
* enforce zisi when target is not serverless ([#22](https://www.github.com/netlify/netlify-plugin-nextjs/issues/22)) ([81fbece](https://www.github.com/netlify/netlify-plugin-nextjs/commit/81fbece88d73d0e224a331755c013eab3a1f94a8))
* force target: server ([14d425d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/14d425d8c06069da63850702d25c3e634d548a7e))
* foundational commit with poc integrated ([c2668af](https://www.github.com/netlify/netlify-plugin-nextjs/commit/c2668af24a78eb69b33222913f44c1900a3bce23))
* handle old next version ([#20](https://www.github.com/netlify/netlify-plugin-nextjs/issues/20)) ([83a4931](https://www.github.com/netlify/netlify-plugin-nextjs/commit/83a4931cd8434481ef16203f9783f9771e589bef))
* i18n ([aba1c96](https://www.github.com/netlify/netlify-plugin-nextjs/commit/aba1c96f296232cb33ab32737fdc4f5522c9b16d))
* image support ([#9](https://www.github.com/netlify/netlify-plugin-nextjs/issues/9)) ([96a7c7d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/96a7c7d0ccab4d82ae93053608c5269725d75ebf))
* make mvp plugin tests pass ([b80a945](https://www.github.com/netlify/netlify-plugin-nextjs/commit/b80a945e19b65521fb8920cdfaad5f3f4405cd56))
* monorepo support ([#15](https://www.github.com/netlify/netlify-plugin-nextjs/issues/15)) ([b7cf298](https://www.github.com/netlify/netlify-plugin-nextjs/commit/b7cf29881c2d1ea3b7688bed4788540b33f75183))
* preview mode ([#16](https://www.github.com/netlify/netlify-plugin-nextjs/issues/16)) ([7822aed](https://www.github.com/netlify/netlify-plugin-nextjs/commit/7822aed84c09c1ddc5c6a143babf3bd34e78e325))
* use nft bundler ([#51](https://www.github.com/netlify/netlify-plugin-nextjs/issues/51)) ([e2b974f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/e2b974f4d9d49a6c44b538354ff9efee249cb65c))


### Bug Fixes

* check for public dir ([#35](https://www.github.com/netlify/netlify-plugin-nextjs/issues/35)) ([ee659ce](https://www.github.com/netlify/netlify-plugin-nextjs/commit/ee659ce21a1434d1f722ee8eb39b923f3ae8472f))
* check for public dir ([#35](https://www.github.com/netlify/netlify-plugin-nextjs/issues/35)) ([c3f8aca](https://www.github.com/netlify/netlify-plugin-nextjs/commit/c3f8aca04397e7cbe27f0ea6b360eefaff34bc89))
* correct publish script ([#13](https://www.github.com/netlify/netlify-plugin-nextjs/issues/13)) ([58c37a6](https://www.github.com/netlify/netlify-plugin-nextjs/commit/58c37a60e3887bbc29d703450ea763f39a1dcdbc))
* **deps:** update dependency @babel/core to v7.15.8 ([d84cf89](https://www.github.com/netlify/netlify-plugin-nextjs/commit/d84cf894a2440cc5bf2c7b7a70d97a2f5cf049c0))
* **deps:** update dependency @netlify/ipx to ^0.0.7 ([#38](https://www.github.com/netlify/netlify-plugin-nextjs/issues/38)) ([12db7e6](https://www.github.com/netlify/netlify-plugin-nextjs/commit/12db7e637f82ff7f9a30dcfd24eadbcde9f22b20))
* **deps:** update dependency fs-extra to v10 ([#30](https://www.github.com/netlify/netlify-plugin-nextjs/issues/30)) ([18db8b5](https://www.github.com/netlify/netlify-plugin-nextjs/commit/18db8b5932923925300ff665212b309f4d92e8b0))
* **deps:** update dependency next to v11.1.3-canary.71 ([#695](https://www.github.com/netlify/netlify-plugin-nextjs/issues/695)) ([51b6016](https://www.github.com/netlify/netlify-plugin-nextjs/commit/51b60160d432d11afebd4fc22c6b6bf74d590dcb))
* include base static redirect for i18n sites too ([#36](https://www.github.com/netlify/netlify-plugin-nextjs/issues/36)) ([431b1f9](https://www.github.com/netlify/netlify-plugin-nextjs/commit/431b1f901f10789642170450917203ee1e6d6ae8))
* locale splat for _next/static redirect ([6837653](https://www.github.com/netlify/netlify-plugin-nextjs/commit/683765376b10d76aa89e8b460fab2223c5be680b))
* preserve cypress cache ([#52](https://www.github.com/netlify/netlify-plugin-nextjs/issues/52)) ([19197f2](https://www.github.com/netlify/netlify-plugin-nextjs/commit/19197f25ed54c8fe5c99c6112741fa426f7f0ef8))
* remove swc binaries ([#17](https://www.github.com/netlify/netlify-plugin-nextjs/issues/17)) ([be2ad48](https://www.github.com/netlify/netlify-plugin-nextjs/commit/be2ad48ecbe4b12aeb083ec84c3a3c7075f0d992))
* server loading ([#24](https://www.github.com/netlify/netlify-plugin-nextjs/issues/24)) ([2d2c198](https://www.github.com/netlify/netlify-plugin-nextjs/commit/2d2c198ce70ea3444b128f516f23bf5eb8b3177b))
* test, we will deal with testing-library after ([7204d41](https://www.github.com/netlify/netlify-plugin-nextjs/commit/7204d419a4fe139894ba5bc14921687401c6de6e))
* update snapshot ([a11c57f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/a11c57fa7c44c68d368db16758173c3da1dc2727))
