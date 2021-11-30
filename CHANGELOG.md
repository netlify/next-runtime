# Changelog

## [4.0.0-beta.12](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.11...v4.0.0-beta.12) (2021-11-30)


### Features

* add experimental support for TTL ([#833](https://www.github.com/netlify/netlify-plugin-nextjs/issues/833)) ([14ca14a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/14ca14a9fabc7a1fc3574e9cd9b53529f19a44c6))
* add support for Next env vars ([#842](https://www.github.com/netlify/netlify-plugin-nextjs/issues/842)) ([24fd88a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/24fd88a843767a7df9633f6c18d7ee7fc9724279))


### Miscellaneous Chores

* **deps:** update dependency @netlify/build to v19 ([#840](https://www.github.com/netlify/netlify-plugin-nextjs/issues/840)) ([d927524](https://www.github.com/netlify/netlify-plugin-nextjs/commit/d927524219941fea3206abb15b2d26d6325d2921))

## [4.0.0-beta.11](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.10...v4.0.0-beta.11) (2021-11-24)


### Bug Fixes

* handle missing i18n object ([#837](https://www.github.com/netlify/netlify-plugin-nextjs/issues/837)) ([3b6d293](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3b6d2938f0893fd4376a3f918d6f3ff81c720248))

## [4.0.0-beta.10](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.9...v4.0.0-beta.10) (2021-11-24)



### Bug Fixes

* replace node-fetch with builtin ([#834](https://www.github.com/netlify/netlify-plugin-nextjs/issues/834)) ([6ff3100](https://www.github.com/netlify/netlify-plugin-nextjs/commit/6ff31005e87262a26c47e3fe1d6fe14d990e5554))
* correct redirect priority and correctly handle ISR pages assets ([#826](https://www.github.com/netlify/netlify-plugin-nextjs/issues/826)) ([6b61643](https://www.github.com/netlify/netlify-plugin-nextjs/commit/6b61643a7d8b3f5a7c10642d250a665dfc25037c))
* **deps:** update dependency @netlify/functions to ^0.10.0 ([#830](https://www.github.com/netlify/netlify-plugin-nextjs/issues/830)) ([3256839](https://www.github.com/netlify/netlify-plugin-nextjs/commit/32568394b2022edc14911809ebbfbff81ac26da6))
* don't move files to the CDN if they match redirect/rewrite rules ([#832](https://www.github.com/netlify/netlify-plugin-nextjs/issues/832)) ([9e3dd0e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/9e3dd0ea359ccaa17ed72644faa80aefd1cf9835))

## [4.0.0-beta.9](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.8...v4.0.0-beta.9) (2021-11-19)


### Bug Fixes

* gracefully handle mssing middleware ([#821](https://www.github.com/netlify/netlify-plugin-nextjs/issues/821)) ([4cee35d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/4cee35d62c918fb6f893d740bc0c382028b43965))

## [4.0.0-beta.8](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.7...v4.0.0-beta.8) (2021-11-19)


### Features

* don't move files to CDN if they match middleware ([#812](https://www.github.com/netlify/netlify-plugin-nextjs/issues/812)) ([615c97a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/615c97ab63350430d520845567a5235a40512873))
* move static pages by default ([#816](https://www.github.com/netlify/netlify-plugin-nextjs/issues/816)) ([12ce69e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/12ce69ef817c8125e82f367993b62c3631af2e30))

## [4.0.0-beta.7](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.6...v4.0.0-beta.7) (2021-11-17)


### Features

* add docs on middleware ([#795](https://www.github.com/netlify/netlify-plugin-nextjs/issues/795)) ([3b4a8c4](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3b4a8c40e6300c0104c557bf7379859afe2be682))
* log warning if old functions exist ([#801](https://www.github.com/netlify/netlify-plugin-nextjs/issues/801)) ([01faf58](https://www.github.com/netlify/netlify-plugin-nextjs/commit/01faf5853cd5e536b7549e627e2e65bcd6c4018f))


### Bug Fixes

* **deps:** update dependency @netlify/functions to ^0.9.0 ([#807](https://www.github.com/netlify/netlify-plugin-nextjs/issues/807)) ([3deec1d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3deec1d7f32e1b77b0812b8f1e6da30976e5448c))
* ensure path is encoded ([#800](https://www.github.com/netlify/netlify-plugin-nextjs/issues/800)) ([b0f666e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/b0f666ee8aad046503f0d562d0c3e4ac4275b945))
* use forced catchall for preview mode ([#793](https://www.github.com/netlify/netlify-plugin-nextjs/issues/793)) ([fd7130f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/fd7130f4a15f51e0785cdd9515faeb10cffb67a5))


### Miscellaneous Chores

* add docs on rewrites and redirects ([#767](https://www.github.com/netlify/netlify-plugin-nextjs/issues/767)) ([b32a08c](https://www.github.com/netlify/netlify-plugin-nextjs/commit/b32a08c01a8e440d2c5a570c50128fdc37cf89a8))

## [4.0.0-beta.6](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.5...v4.0.0-beta.6) (2021-11-08)


### Bug Fixes

* handle static file glob on Windows ([#778](https://www.github.com/netlify/netlify-plugin-nextjs/issues/778)) ([1cc222a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/1cc222a866c2bb410965a2867984005737792fb3))
* use glob to select files to move ([#768](https://www.github.com/netlify/netlify-plugin-nextjs/issues/768)) ([faeb703](https://www.github.com/netlify/netlify-plugin-nextjs/commit/faeb7033296a43cee7a4494298d0df4f7e78bbd3))

## [4.0.0-beta.5](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.4...v4.0.0-beta.5) (2021-11-03)


### Bug Fixes

* add missing middleware runtime file ([#762](https://www.github.com/netlify/netlify-plugin-nextjs/issues/762)) ([83378b4](https://www.github.com/netlify/netlify-plugin-nextjs/commit/83378b4f53467284016c2ca7b3b121ca0079a1cc))
* **deps:** update dependency node-fetch to v2.6.6 ([#758](https://www.github.com/netlify/netlify-plugin-nextjs/issues/758)) ([759915b](https://www.github.com/netlify/netlify-plugin-nextjs/commit/759915bf98f6963cbf35619c28a719fecdd50ea7))
* don't force rewrite in preview mode ([#761](https://www.github.com/netlify/netlify-plugin-nextjs/issues/761)) ([c88a504](https://www.github.com/netlify/netlify-plugin-nextjs/commit/c88a504e36883a644516e6b7afc8bbce00a68858))

## [4.0.0-beta.4](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.3...v4.0.0-beta.4) (2021-10-27)


### Bug Fixes

* correctly resolve zip path  ([#744](https://www.github.com/netlify/netlify-plugin-nextjs/issues/744)) ([68b5662](https://www.github.com/netlify/netlify-plugin-nextjs/commit/68b56620946364f8bd9b90896c1a9c0cba78d7a7))
* **deps:** update dependency @netlify/functions to ^0.8.0 ([#747](https://www.github.com/netlify/netlify-plugin-nextjs/issues/747)) ([2c87e30](https://www.github.com/netlify/netlify-plugin-nextjs/commit/2c87e307568a6547432bf6995b9427077561c74b))
* exclude electron by default ([#746](https://www.github.com/netlify/netlify-plugin-nextjs/issues/746)) ([887b90a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/887b90a8f6cc63f3e44c6bc85888eb4d609d9ee4))

## [4.0.0-beta.3](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.2...v4.0.0-beta.3) (2021-10-26)


### Features

* support moving static pages out of function bundle ([#728](https://www.github.com/netlify/netlify-plugin-nextjs/issues/728)) ([3da9c77](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3da9c77d8a021c30253c42eeab69c8feed5e79f5))
* warn if zip is too large, and log the largest files ([#730](https://www.github.com/netlify/netlify-plugin-nextjs/issues/730)) ([9989c0a](https://www.github.com/netlify/netlify-plugin-nextjs/commit/9989c0a46decc3370b7fb102774360e3268f571f))


### Bug Fixes

* disable serverless targets ([#739](https://www.github.com/netlify/netlify-plugin-nextjs/issues/739)) ([01fa113](https://www.github.com/netlify/netlify-plugin-nextjs/commit/01fa113664333db182424607ff4c2172d6fcfd59))
* ensure stale-while-revalidate headers are not sent ([#737](https://www.github.com/netlify/netlify-plugin-nextjs/issues/737)) ([ef2da0d](https://www.github.com/netlify/netlify-plugin-nextjs/commit/ef2da0d8355fa7b60c1f451f19af7d2eb61ee326))
* typo in readme ([#731](https://www.github.com/netlify/netlify-plugin-nextjs/issues/731)) ([bfc016f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/bfc016f222d7e3e778fc20efa63d0e33dcc011e9))
* use nft for ipx bundle ([#725](https://www.github.com/netlify/netlify-plugin-nextjs/issues/725)) ([0321f68](https://www.github.com/netlify/netlify-plugin-nextjs/commit/0321f68c301cae351704d0180dc17201141ddc94))
* use platform-agnostic paths, and add test to be sure ([#736](https://www.github.com/netlify/netlify-plugin-nextjs/issues/736)) ([d448b11](https://www.github.com/netlify/netlify-plugin-nextjs/commit/d448b11d3d1730524c9d11ec749d2970f09ba7ea))

## [4.0.0-beta.2](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.1...v4.0.0-beta.2) (2021-10-19)


### Features

* Enable persistent builders by default ([#716](https://www.github.com/netlify/netlify-plugin-nextjs/issues/716)) ([de07dc2](https://www.github.com/netlify/netlify-plugin-nextjs/commit/de07dc2e21c40feced296b4acb1bf2b03fe97485))


### Bug Fixes

* correctly exclude files ([#720](https://www.github.com/netlify/netlify-plugin-nextjs/issues/720)) ([efba43e](https://www.github.com/netlify/netlify-plugin-nextjs/commit/efba43ec687f01094eb31af0b2baab36bee59ffc))
* pass query string to handler ([#719](https://www.github.com/netlify/netlify-plugin-nextjs/issues/719)) ([ff09cae](https://www.github.com/netlify/netlify-plugin-nextjs/commit/ff09cae3940e6b3c16c0ce718664051f2c6d9537))

## [4.0.0-beta.1](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.0...v4.0.0-beta.1) (2021-10-15)


### Bug Fixes

* pass correct path to odb ([#702](https://www.github.com/netlify/netlify-plugin-nextjs/issues/702)) ([7c5a8ae](https://www.github.com/netlify/netlify-plugin-nextjs/commit/7c5a8ae9def9d23a6e9a05a8f52ef22181dd7572))


### Miscellaneous Chores

* update min build version ([#704](https://www.github.com/netlify/netlify-plugin-nextjs/issues/704)) ([3e1930f](https://www.github.com/netlify/netlify-plugin-nextjs/commit/3e1930f5ea62a7332bdace7e9a95b68dc32ab954))

## [4.0.0-beta.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v3.9.1...v4.0.0-beta.0) (2021-10-15)


A complete rewrite of the Essential Next plugin. See the README for details and migration instructions
