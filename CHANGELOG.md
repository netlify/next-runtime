# Changelog

## [4.0.0](https://www.github.com/netlify/netlify-plugin-nextjs/compare/v4.0.0-beta.5...v4.0.0) (2021-11-08)


### Bug Fixes

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
