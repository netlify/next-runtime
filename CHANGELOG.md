# Changelog

## [5.3.2](https://github.com/netlify/next-runtime/compare/v5.3.1...v5.3.2) (2024-05-28)

### Bug Fixes

* allow parallel routes to resolve without routing to a 404 page ([#516](https://github.com/netlify/next-runtime/issues/516)) ([04dc3ec](https://github.com/netlify/next-runtime/commit/04dc3ecb4c6723e235f42e0ae305229497bdac03))
* ensure locale is in next response url to allow page locale to inferred downstream ([#533](https://github.com/netlify/next-runtime/issues/533)) ([59b575e](https://github.com/netlify/next-runtime/commit/59b575e5ce3db1aac6777648ede245f5358de070))
* manually triggered notFound pages in page-router for older versions of next ([#541](https://github.com/netlify/next-runtime/issues/541)) ([30ef981](https://github.com/netlify/next-runtime/commit/30ef98119d5d8a7deb48c90454e0983526246f18))

## [5.3.1](https://github.com/netlify/next-runtime/compare/v5.3.0...v5.3.1) (2024-05-22)

### Bug Fixes

* **deps:** update dependency @netlify/functions to ^2.7.0 ([964ef13](https://github.com/netlify/next-runtime/commit/964ef13ad87c90356149b50b2e523462bc928564))
* **deps:** update dependency @netlify/plugin-nextjs to ^5.3.0 ([014be75](https://github.com/netlify/next-runtime/commit/014be7581f9571823843572b096d3d602f42f4ca))
* don't warn about PPR ([#506](https://github.com/netlify/next-runtime/issues/506)) ([f62c009](https://github.com/netlify/next-runtime/commit/f62c009703ecd24da0a5213e83fafae296d295fd))

## [5.3.0](https://github.com/netlify/next-runtime/compare/v5.2.2...v5.3.0) (2024-05-20)

### Features

* Set experimentalRegion to 'context' in order to enable colocated blobs ([#488](https://github.com/netlify/next-runtime/issues/488)) ([a72a837](https://github.com/netlify/next-runtime/commit/a72a837f108acbe8187b1bfe3c457f6a3e61b2e8))

### Bug Fixes

* **deps:** update dependency chart.js to v4.4.3 ([ee6e185](https://github.com/netlify/next-runtime/commit/ee6e185ed3ee0707a16795cfdbed94eedf9aaa19))
* leverage system logger for debug logs (instead of console) ([#467](https://github.com/netlify/next-runtime/issues/467)) ([b352d96](https://github.com/netlify/next-runtime/commit/b352d96fba5f1797427a4b71f41c4cd190cedab3))

## [5.2.2](https://github.com/netlify/next-runtime/compare/v5.2.1...v5.2.2) (2024-05-07)

### Bug Fixes

* normalize trailing slash when handling middleware rewrites ([#448](https://github.com/netlify/next-runtime/issues/448)) ([2012922](https://github.com/netlify/next-runtime/commit/2012922c91878af7d5008136e2dc4e6b59a6bc96))
* separate response cache if debug logging header is used ([#384](https://github.com/netlify/next-runtime/issues/384)) ([68f8e79](https://github.com/netlify/next-runtime/commit/68f8e7917264e6fba13dbe2f0d9247a26a9b1bec))
* support revalidating multiple tags at once ([#464](https://github.com/netlify/next-runtime/issues/464)) ([62ea699](https://github.com/netlify/next-runtime/commit/62ea69927233412ec369e0923a60109bf0a7b100))

## [5.2.1](https://github.com/netlify/next-runtime/compare/v5.2.0...v5.2.1) (2024-05-02)

### Bug Fixes

* don't normalize url if `x-nextjs-redirect` header is present ([#424](https://github.com/netlify/next-runtime/issues/424)) ([f23da82](https://github.com/netlify/next-runtime/commit/f23da8237144b0b575b07c2839883b2012fba502))

## [5.2.0](https://github.com/netlify/next-runtime/compare/v5.1.2...v5.2.0) (2024-04-30)

### Features

* support dotenv files ([#429](https://github.com/netlify/next-runtime/issues/429)) ([39f5ae1](https://github.com/netlify/next-runtime/commit/39f5ae1c408420b64835ab74344a185dac07b515))
* Update to latest blob client (7.3.0) ([#398](https://github.com/netlify/next-runtime/issues/398)) ([8b3f65b](https://github.com/netlify/next-runtime/commit/8b3f65b438816c746b1ac07108d2c929b529b98e))

### Bug Fixes

* apply useRegionalBlobs replacement for non-monorepo template ([#431](https://github.com/netlify/next-runtime/issues/431)) ([d73a912](https://github.com/netlify/next-runtime/commit/d73a91269645891c271c059132717147b6a53b93))
* disable regional blobs until feature is ready for release ([#433](https://github.com/netlify/next-runtime/issues/433)) ([9620588](https://github.com/netlify/next-runtime/commit/9620588ff1f2276fea9d0ffeb9d22a5c50b9f45e))
* remove blob folder in pre-dev ([#430](https://github.com/netlify/next-runtime/issues/430)) ([3749c3c](https://github.com/netlify/next-runtime/commit/3749c3c8605e32b15cdf66c89f930e7104b76b3b))
* track background work ([#407](https://github.com/netlify/next-runtime/issues/407)) ([296e8fe](https://github.com/netlify/next-runtime/commit/296e8fe9c7b4e0b0e3998884c418bea3073928f6))
* track background work pre batchers ([#423](https://github.com/netlify/next-runtime/issues/423)) ([292331d](https://github.com/netlify/next-runtime/commit/292331d5519db3c0a312959a70cd4ef61b0ebcd2))

## [5.1.2](https://github.com/netlify/next-runtime/compare/v5.1.1...v5.1.2) (2024-04-18)

### Bug Fixes

* more robust handling of export output ([#418](https://github.com/netlify/next-runtime/issues/418)) ([d66e30b](https://github.com/netlify/next-runtime/commit/d66e30b8099971e4db10bd460433923d1b1e9e40))

## [5.1.1](https://github.com/netlify/next-runtime/compare/v5.1.0...v5.1.1) (2024-04-17)

### Bug Fixes

* honor user defined netlify-vary ([#410](https://github.com/netlify/next-runtime/issues/410)) ([57d8d26](https://github.com/netlify/next-runtime/commit/57d8d26d5a52103aa3919745e36a384047d6e596))

## [5.1.0](https://github.com/netlify/next-runtime/compare/v5.0.0...v5.1.0) (2024-04-16)

### Features

* add cdn-cache-control headers to cacheable route handler responses ([#399](https://github.com/netlify/next-runtime/issues/399)) ([f4c588c](https://github.com/netlify/next-runtime/commit/f4c588c2aa01bebf36a87e8a3800b775a638e543))
* fail the build when advanced api routes are used ([#403](https://github.com/netlify/next-runtime/issues/403)) ([275f488](https://github.com/netlify/next-runtime/commit/275f488de53b4eb1041812dd813ca2528e48bc02))

## [5.0.0](https://github.com/netlify/next-runtime/compare/v5.0.0-alpha.25...v5.0.0) (2024-04-02)

### Features

* add build time o11ty to the runtime ([#372](https://github.com/netlify/next-runtime/issues/372)) ([93036f7](https://github.com/netlify/next-runtime/commit/93036f7a8b997d906606cfc7aed4f78865a942ee))
* add first part of the open telemetry integration to the runtime ([#232](https://github.com/netlify/next-runtime/issues/232)) ([8b17f09](https://github.com/netlify/next-runtime/commit/8b17f090c6ef1048d07a600e7e89c6f45918406f))
* add middleware routing ([#146](https://github.com/netlify/next-runtime/issues/146)) ([8fc84c5](https://github.com/netlify/next-runtime/commit/8fc84c54f99be86ec96dc3ceef34b9e7fa1a0615))
* add mono repository support ([#123](https://github.com/netlify/next-runtime/issues/123)) ([53f0f36](https://github.com/netlify/next-runtime/commit/53f0f3681cb0841eeb08108b244a5cd6778bdf3b))
* add next.js version check and fail the build if version not satisfied ([#291](https://github.com/netlify/next-runtime/issues/291)) ([72101f3](https://github.com/netlify/next-runtime/commit/72101f37241587073c585764752eb8d50e59e03a))
* add system logging to middleware handler ([#174](https://github.com/netlify/next-runtime/issues/174)) ([1eee565](https://github.com/netlify/next-runtime/commit/1eee56577cd340c5a7a2dfc6b9e51cdea348b613))
* add systemlog shim ([#127](https://github.com/netlify/next-runtime/issues/127)) ([dab9ead](https://github.com/netlify/next-runtime/commit/dab9ead42dbdc5830ca6313fcf0d25ddc67cd655))
* check for root publish dir ([#292](https://github.com/netlify/next-runtime/issues/292)) ([f2084b8](https://github.com/netlify/next-runtime/commit/f2084b8f31ba73086f04affe0887c264118ab3f8))
* fail build if BUILD_ID is not found at location it will be read from in runtime ([#313](https://github.com/netlify/next-runtime/issues/313)) ([d06ca25](https://github.com/netlify/next-runtime/commit/d06ca25dbe4dbe339d82a855714f127d2070f784))
* handle /_next/image through Netlify Image CDN for local images ([#149](https://github.com/netlify/next-runtime/issues/149)) ([4bf8641](https://github.com/netlify/next-runtime/commit/4bf864157b0421ccaf6d1a0efcedcc645122a7d5))
* normalise URLs in edge middleware ([#176](https://github.com/netlify/next-runtime/issues/176)) ([5155474](https://github.com/netlify/next-runtime/commit/515547403dfec750ef378b54da68d56bf5f75f06))
* remove x-nextjs-cache header and add Cache-Status instead ([#158](https://github.com/netlify/next-runtime/issues/158)) ([5b477db](https://github.com/netlify/next-runtime/commit/5b477db3da7817e6bf7f78271c64d2b5cfd4ac94))
* start moving to SugaredTracer and collect spans manually to be able to create 'server-timing' header when debugging ([#358](https://github.com/netlify/next-runtime/issues/358)) ([311fafe](https://github.com/netlify/next-runtime/commit/311fafe13c039499b9bcb69f760a2922007417fa))
* stop running middleware at the origin ([#125](https://github.com/netlify/next-runtime/issues/125)) ([3e743de](https://github.com/netlify/next-runtime/commit/3e743de469585be4bcf2822debc1cb91b5944aef))
* support also x-next-debug-logging to enable server-timing ([#359](https://github.com/netlify/next-runtime/issues/359)) ([d045755](https://github.com/netlify/next-runtime/commit/d045755767191df8d8e2bce9c5eb234d4042b848))
* support edge middleware ([#114](https://github.com/netlify/next-runtime/issues/114)) ([a1eaca3](https://github.com/netlify/next-runtime/commit/a1eaca369cf0a2c2e585b3fd899e39e525e914a2))
* support nx integrated setups inside runtime ([#251](https://github.com/netlify/next-runtime/issues/251)) ([994be8e](https://github.com/netlify/next-runtime/commit/994be8eb8c2f9f364cfc2dbaa3c8238cc3a159bc))
* support static export ([#349](https://github.com/netlify/next-runtime/issues/349)) ([e2737bc](https://github.com/netlify/next-runtime/commit/e2737bc57c8f063c08a378d99417b3d77038ae1f))
* swap publish/static dirs ([#93](https://github.com/netlify/next-runtime/issues/93)) ([a31816e](https://github.com/netlify/next-runtime/commit/a31816e869b450b41ae569fa43c0e3b3b68fcc4e))
* use blob key encoding ([#108](https://github.com/netlify/next-runtime/issues/108)) ([1277f85](https://github.com/netlify/next-runtime/commit/1277f85b01dcfe64e661355ac31a03034d66cdc4))
* use in-source path over redirects for Server Handler ([#122](https://github.com/netlify/next-runtime/issues/122)) ([aaf12cc](https://github.com/netlify/next-runtime/commit/aaf12cc21fc04d3fe8386d9a19ddbf384c6998b1))
* use new blob store api ([#100](https://github.com/netlify/next-runtime/issues/100)) ([0f4eb7a](https://github.com/netlify/next-runtime/commit/0f4eb7adc8f0f3e2b8744035974340184a00cb45))
* use prerenderManifest data instead of globbing when copying prerendered content ([#105](https://github.com/netlify/next-runtime/issues/105)) ([60594f1](https://github.com/netlify/next-runtime/commit/60594f18a78a7ae543c1d4445e85a5c33d4f0e2c))
* write tags manifest at build time to simplify request time response tagging ([#94](https://github.com/netlify/next-runtime/issues/94)) ([a0c93ca](https://github.com/netlify/next-runtime/commit/a0c93cab29401eed6e1c606d7ee29209f1fd13b0))

### Bug Fixes

* apply permanent cdn-cache-control for fully static page ([#274](https://github.com/netlify/next-runtime/issues/274)) ([9c2f0bb](https://github.com/netlify/next-runtime/commit/9c2f0bbe5c5e7ba0198cd1abb690ca8e83951cc1))
* avoid PPR build error ([#286](https://github.com/netlify/next-runtime/issues/286)) ([8217f50](https://github.com/netlify/next-runtime/commit/8217f5037a0836ab6cd46b7433cb8ca5c0891413))
* await copyStaticExport ([#374](https://github.com/netlify/next-runtime/issues/374)) ([1c814f8](https://github.com/netlify/next-runtime/commit/1c814f855e0848fcb9b0bd85f06ee26b048c123e))
* blob key collisions ([#212](https://github.com/netlify/next-runtime/issues/212)) ([7c33ac3](https://github.com/netlify/next-runtime/commit/7c33ac3300292fd0e793e169d887471887701b48))
* bundle edge chunks with lambda ([#152](https://github.com/netlify/next-runtime/issues/152)) ([c5008a4](https://github.com/netlify/next-runtime/commit/c5008a454478e5e439bca6c082d112ba1c87d829))
* cache freshness for ISR content ([#235](https://github.com/netlify/next-runtime/issues/235)) ([4a0c285](https://github.com/netlify/next-runtime/commit/4a0c285bc4580df299210bc5b1ac8ae7e4c53153))
* concatenate all edge chunks ([#319](https://github.com/netlify/next-runtime/issues/319)) ([b3aaed6](https://github.com/netlify/next-runtime/commit/b3aaed681210fee0198b5cb0b6fcc8cd717d0324))
* copy-next-code on windows ([#297](https://github.com/netlify/next-runtime/issues/297)) ([077cc18](https://github.com/netlify/next-runtime/commit/077cc1895a1e44d43ba13b8636596cb9c9663429))
* correctly handle middleware header mutations ([#225](https://github.com/netlify/next-runtime/issues/225)) ([da7aa22](https://github.com/netlify/next-runtime/commit/da7aa22fb0ceea68eaf39ecb49997077d81a36c5))
* correctly handle query params on data rewrites ([#196](https://github.com/netlify/next-runtime/issues/196)) ([abd7509](https://github.com/netlify/next-runtime/commit/abd7509351cbac4cac847efbe7eabe512340a116))
* correctly serve images by storing binary as base64 ([#241](https://github.com/netlify/next-runtime/issues/241)) ([22afaa8](https://github.com/netlify/next-runtime/commit/22afaa8c461450c0da6a8d8bfdd7a014a2cbad7a))
* create server handler in sequential steps ([#373](https://github.com/netlify/next-runtime/issues/373)) ([96f8fe7](https://github.com/netlify/next-runtime/commit/96f8fe76c8a2475b51c70115a5835240ac502731))
* **deps:** update dependency @netlify/blobs to ^4.2.0 ([#86](https://github.com/netlify/next-runtime/issues/86)) ([77c2a9c](https://github.com/netlify/next-runtime/commit/77c2a9c80eec1d0739df5ec173f8ea5f1b19689d))
* **deps:** update dependency @netlify/blobs to v6 ([#92](https://github.com/netlify/next-runtime/issues/92)) ([f462438](https://github.com/netlify/next-runtime/commit/f462438066ac6e8809637d9346cb8b0fbe014995))
* **deps:** update dependency @netlify/functions to ^2.4.0 ([c566ffa](https://github.com/netlify/next-runtime/commit/c566ffa98369df6b5cba19d287d0ed980263548f))
* disable transfer-encoding leading to problems in fastly ([#333](https://github.com/netlify/next-runtime/issues/333)) ([4080e1c](https://github.com/netlify/next-runtime/commit/4080e1c3223acce7117ea04fb3fc195606954e0f))
* don't mutate route data, instead create new object to set as blob ([#391](https://github.com/netlify/next-runtime/issues/391)) ([98eb35f](https://github.com/netlify/next-runtime/commit/98eb35fc46eafd2d248d74281242f184ad16d905))
* don't run middleware on rewrite target ([#270](https://github.com/netlify/next-runtime/issues/270)) ([c6af678](https://github.com/netlify/next-runtime/commit/c6af67827c04c67f9a7673fc2530264fb41a0cc1))
* don't set SWR cdn cache control on stale responses ([#259](https://github.com/netlify/next-runtime/issues/259)) ([7555b68](https://github.com/netlify/next-runtime/commit/7555b68bca67ef0113a8099c7c9dbbd9f557ec13))
* don't use windows path separators for path templating in monorepo ([#293](https://github.com/netlify/next-runtime/issues/293)) ([5b26311](https://github.com/netlify/next-runtime/commit/5b2631143e35e9b13aa36ccd5caed9cfb69c5305))
* ensure cdn cache control only set for get and head methods ([#137](https://github.com/netlify/next-runtime/issues/137)) ([bf63aa8](https://github.com/netlify/next-runtime/commit/bf63aa8b5eb022032e10a3e9c06a642dd887381e))
* fetch cache tag invalidation ([#268](https://github.com/netlify/next-runtime/issues/268)) ([ede6277](https://github.com/netlify/next-runtime/commit/ede6277da5eadb9bccc7195274bea61ed4b2fab0))
* fix proxying on next@&lt;14.0.2 ([#366](https://github.com/netlify/next-runtime/issues/366)) ([83e9a39](https://github.com/netlify/next-runtime/commit/83e9a39124813927f30110c013a84441c2b9016a))
* fixes an issue where the runtime was not working with pnpm package manager ([#96](https://github.com/netlify/next-runtime/issues/96)) ([b77512e](https://github.com/netlify/next-runtime/commit/b77512ebc3694c537d82d85a544ddef56971ad40))
* fixes an issue where the symlinks where not correctly preserved for pnpm monorepos ([#216](https://github.com/netlify/next-runtime/issues/216)) ([9c35799](https://github.com/netlify/next-runtime/commit/9c35799bee115814e1b772a8823a3d81a6a461ed))
* fixes the runtime inside monorepos like turborepo ([#204](https://github.com/netlify/next-runtime/issues/204)) ([219588e](https://github.com/netlify/next-runtime/commit/219588ea7ae021eb1da267db5685d3cc51e37941))
* fixes the usage of a custom distDir ([#269](https://github.com/netlify/next-runtime/issues/269)) ([6a35de6](https://github.com/netlify/next-runtime/commit/6a35de6a606f9e0545103c3652fa18098e5e0f8a))
* handle ipx redirect that visitors might have browser cached from v4 ([#390](https://github.com/netlify/next-runtime/issues/390)) ([9c0490c](https://github.com/netlify/next-runtime/commit/9c0490cf7b66eeb832253a437d2d6a3edf9d491b))
* handle locales in middleware redirects ([#198](https://github.com/netlify/next-runtime/issues/198)) ([97af130](https://github.com/netlify/next-runtime/commit/97af130304ef8c55c000ccb3d469c7a255a52bf6))
* handle long blob names by truncating them ([#182](https://github.com/netlify/next-runtime/issues/182)) ([b55ca06](https://github.com/netlify/next-runtime/commit/b55ca06dbeba17d8a04c679d742213b4a0ba1299))
* handle middleware rewrite bodies and loops ([#193](https://github.com/netlify/next-runtime/issues/193)) ([fd3c754](https://github.com/netlify/next-runtime/commit/fd3c75433e4ae43064cc2d0067899201946bc956))
* handle middleware rewrites to in data requests ([#180](https://github.com/netlify/next-runtime/issues/180)) ([8b5687c](https://github.com/netlify/next-runtime/commit/8b5687cdf7f164bd62ec145d9329c2d72888348f))
* handle multiple matchers for middleware ([#203](https://github.com/netlify/next-runtime/issues/203)) ([8e9dbb5](https://github.com/netlify/next-runtime/commit/8e9dbb5fd73f8fae91dfb2ca045c82edfe57ac01))
* handle pages router notFound pages ([#318](https://github.com/netlify/next-runtime/issues/318)) ([27a5645](https://github.com/netlify/next-runtime/commit/27a564567b608fd946295046dd26edca0d9b7b93))
* handle parallel routes default layout ([#150](https://github.com/netlify/next-runtime/issues/150)) ([ebe579f](https://github.com/netlify/next-runtime/commit/ebe579f97a4924fe51c033fca6133ca1ee851a75))
* handle redirect response body ([#142](https://github.com/netlify/next-runtime/issues/142)) ([f149e89](https://github.com/netlify/next-runtime/commit/f149e89e24847415488fa69fe7ec808769aba9ff))
* honor skipMiddlewareUrlNormalize ([#287](https://github.com/netlify/next-runtime/issues/287)) ([01e9450](https://github.com/netlify/next-runtime/commit/01e9450082a38872e60da281877c704324ec661a))
* import server in module scope ([#363](https://github.com/netlify/next-runtime/issues/363)) ([bce994d](https://github.com/netlify/next-runtime/commit/bce994d59cc72dde205ddd67b04bda8dd72f8090))
* include static files in the function bundle ([#200](https://github.com/netlify/next-runtime/issues/200)) ([7e79ba7](https://github.com/netlify/next-runtime/commit/7e79ba793afff2bc988c1fc4a8ff286137cfcd2f))
* init blobStore in CacheHandler constructor and not global scope ([#164](https://github.com/netlify/next-runtime/issues/164)) ([1ab8d82](https://github.com/netlify/next-runtime/commit/1ab8d8220e8d24b07ebb45685487d89e69a14977))
* init deployStore on fs.readFile and not when lambda spawns ([#277](https://github.com/netlify/next-runtime/issues/277)) ([6b3edc3](https://github.com/netlify/next-runtime/commit/6b3edc3eece6c105f5c8faa8904d47cc8924837a))
* LastModified Date ([#211](https://github.com/netlify/next-runtime/issues/211)) ([4e5d5fc](https://github.com/netlify/next-runtime/commit/4e5d5fc576674db0c8227b187e540d1b9c434429))
* let next-server handle SWR behavior ([#206](https://github.com/netlify/next-runtime/issues/206)) ([d2eeda9](https://github.com/netlify/next-runtime/commit/d2eeda9f3212f2b8ebcf617da1296396cf14eb12))
* limit amount of concurrent handling of prerendered content ([#356](https://github.com/netlify/next-runtime/issues/356)) ([416f66c](https://github.com/netlify/next-runtime/commit/416f66cb3709ca41df424b340ba1ed418da9c4c7))
* make on-demand revalidation reliable ([#245](https://github.com/netlify/next-runtime/issues/245)) ([d85332a](https://github.com/netlify/next-runtime/commit/d85332a47a92f92d2262f5ca5a5a6a5bfebad4e4))
* match bare route for i18n site middleware ([#288](https://github.com/netlify/next-runtime/issues/288)) ([590db9b](https://github.com/netlify/next-runtime/commit/590db9bc5ebbe8cce8544a25c4e3f81703453f25))
* middleware should run in/out of src dir ([#219](https://github.com/netlify/next-runtime/issues/219)) ([3fb5bda](https://github.com/netlify/next-runtime/commit/3fb5bda1bdbb292557be706d932f9f98e6e3319e))
* normalise basepath ([#228](https://github.com/netlify/next-runtime/issues/228)) ([15116a0](https://github.com/netlify/next-runtime/commit/15116a0fa5d9320b861dc51813140000dc1c8b9f))
* normalise middleware data URL requests ([#267](https://github.com/netlify/next-runtime/issues/267)) ([fa41fce](https://github.com/netlify/next-runtime/commit/fa41fce4d3b33dde0f5774941cf5eb6f5fe70865))
* normalise redirect/rewrite target locales ([#226](https://github.com/netlify/next-runtime/issues/226)) ([402caae](https://github.com/netlify/next-runtime/commit/402caaea0d5d8f2b2e09c92307ad7e9eab3b99d4))
* only populate build cache when run inside buildbot ([#199](https://github.com/netlify/next-runtime/issues/199)) ([a4c49e2](https://github.com/netlify/next-runtime/commit/a4c49e25dbd240bf59276bcd379cc9ecfb5b9d8d))
* overriding headers in route handlers should work ([#195](https://github.com/netlify/next-runtime/issues/195)) ([636449d](https://github.com/netlify/next-runtime/commit/636449d8c33c1a9041de6b1ce86d4c3410713de7))
* pass correct domain to server ([#144](https://github.com/netlify/next-runtime/issues/144)) ([ae4285a](https://github.com/netlify/next-runtime/commit/ae4285a34679710f2f8a3fe06987d42b6a983832))
* preserve functions in patched middleware manifest ([#139](https://github.com/netlify/next-runtime/issues/139)) ([d17c030](https://github.com/netlify/next-runtime/commit/d17c030ab85885eb82c825d2c3acf5d192a6a62b))
* preserve locale in redirects ([#276](https://github.com/netlify/next-runtime/issues/276)) ([c4c4214](https://github.com/netlify/next-runtime/commit/c4c4214f867f057458d211edeeee29b7535d55e2))
* prevent infinite loop cause by global fetch patched by Next.js ([#167](https://github.com/netlify/next-runtime/issues/167)) ([616b94a](https://github.com/netlify/next-runtime/commit/616b94a4fd51d2113e9426dd54ce2bd5b380d3ac))
* prewarm entrypoint ([#351](https://github.com/netlify/next-runtime/issues/351)) ([31484aa](https://github.com/netlify/next-runtime/commit/31484aa126df5e7a5a49e0077c9177514d71c16a))
* put in real system logger ([#177](https://github.com/netlify/next-runtime/issues/177)) ([b874afc](https://github.com/netlify/next-runtime/commit/b874afcc1a23ce8ee75918af9cfce90c3b070976))
* reduce reliance on PACKAGE_PATH ([#340](https://github.com/netlify/next-runtime/issues/340)) ([4b53c21](https://github.com/netlify/next-runtime/commit/4b53c21b23c3c77b4bd200b4ce7f31c319873645))
* remove accepts encoding workaround ([#264](https://github.com/netlify/next-runtime/issues/264)) ([d79d333](https://github.com/netlify/next-runtime/commit/d79d333203ca3d136eda29a2264f6d587c7eb1bb))
* remove temp publish dir before moving static content ([#278](https://github.com/netlify/next-runtime/issues/278)) ([3d7b20f](https://github.com/netlify/next-runtime/commit/3d7b20f8c69b23d6cbc8d9063850be9f73300236))
* resolve run-config.json in runtime from PLUGIN_DIR not cwd ([#285](https://github.com/netlify/next-runtime/issues/285)) ([0348fac](https://github.com/netlify/next-runtime/commit/0348fac97f114f29ffd568e514df5a8549db1319))
* respect user defined included_files for functions from netlify.toml ([#298](https://github.com/netlify/next-runtime/issues/298)) ([e5192f2](https://github.com/netlify/next-runtime/commit/e5192f2752526431318cb046efc1fd7ca8a22851))
* rewrites shouldn't be following redirects ([#253](https://github.com/netlify/next-runtime/issues/253)) ([30b091c](https://github.com/netlify/next-runtime/commit/30b091ccc3369d1369f6f4944c8370a3b145913d))
* set correct date header for cached objects ([#124](https://github.com/netlify/next-runtime/issues/124)) ([4523c5f](https://github.com/netlify/next-runtime/commit/4523c5f0a002cd4f3df7cb8a3fcf12cab4d292f3))
* shim `require("node:buffer")` ([#233](https://github.com/netlify/next-runtime/issues/233)) ([00662dc](https://github.com/netlify/next-runtime/commit/00662dc23134ee7a021ae5a70c19c8716c4ac52c))
* shim process in edge runtime ([#132](https://github.com/netlify/next-runtime/issues/132)) ([7d01157](https://github.com/netlify/next-runtime/commit/7d01157d328d7740e182c09144eb8f780f5f87e4))
* standardize stale-while-revalidate header ([#95](https://github.com/netlify/next-runtime/issues/95)) ([1220e04](https://github.com/netlify/next-runtime/commit/1220e042ed48baa36a4028f66889655b0d4316eb))
* strip internal middleware header from responses ([#160](https://github.com/netlify/next-runtime/issues/160)) ([e270811](https://github.com/netlify/next-runtime/commit/e2708111a838db838c0e36628d8dc1f0a4587643))
* strip locale from path passed to middleware ([#194](https://github.com/netlify/next-runtime/issues/194)) ([5e88d33](https://github.com/netlify/next-runtime/commit/5e88d33f4f9bc9766379bbfa0d9929f61d4aed6a))
* support basepath for static assets ([#141](https://github.com/netlify/next-runtime/issues/141)) ([84b3a63](https://github.com/netlify/next-runtime/commit/84b3a635a190f591d380650015bdc9a5b1868d82))
* support wasm chunks ([#190](https://github.com/netlify/next-runtime/issues/190)) ([739fbdd](https://github.com/netlify/next-runtime/commit/739fbdd0b0ec93729046c85b9f41d25238bb5f23))
* try to resolve styled-jsx from next context, not serverHandlerContext ([#300](https://github.com/netlify/next-runtime/issues/300)) ([87f3215](https://github.com/netlify/next-runtime/commit/87f321505a094eef08af0cb2f5afb5f7151f2030))
* unstable_cache not working ([#237](https://github.com/netlify/next-runtime/issues/237)) ([c076448](https://github.com/netlify/next-runtime/commit/c076448eca87dd612ada61c8061e205b2fdadec3))
* use response cache key for tag manifest first before falling back to pathname ([#280](https://github.com/netlify/next-runtime/issues/280)) ([51dcbe0](https://github.com/netlify/next-runtime/commit/51dcbe0689f0d3e56f8baebfd89b909638ed8d97))
* use unpatched fetch for all deploystores ([#240](https://github.com/netlify/next-runtime/issues/240)) ([8972e5b](https://github.com/netlify/next-runtime/commit/8972e5b8913327e29683a0df02c2d70b2d892359))
* windows doesnt like renaming into a directory that already exists ([#299](https://github.com/netlify/next-runtime/issues/299)) ([8a60324](https://github.com/netlify/next-runtime/commit/8a60324bbb721ba5675129f058c8bb49b1341b55))

### Performance Improvements

* check any revalidatedTags passed from next first before checking blobs, memoize tag manifest blob gets for duration of request ([#229](https://github.com/netlify/next-runtime/issues/229)) ([39ab537](https://github.com/netlify/next-runtime/commit/39ab537ecd7e7e5aa05c41f15ba7aa7da028acea))
* ensure blob directory exist just once ([#357](https://github.com/netlify/next-runtime/issues/357)) ([037b695](https://github.com/netlify/next-runtime/commit/037b695bbfe7e16de2bfdebcf71b272a6497dbf6))
* reuse lastModified captured in cache handler to calculate date header ([#260](https://github.com/netlify/next-runtime/issues/260)) ([e33bd93](https://github.com/netlify/next-runtime/commit/e33bd93aa2409fe1cd1ab9d6692ec5a6f7d74bf2))
* shim next's telemetry module to improve startup performance ([#365](https://github.com/netlify/next-runtime/issues/365)) ([3d2c429](https://github.com/netlify/next-runtime/commit/3d2c429e91956cdd525d70cae98d8aa1515883da))

### Miscellaneous Chores

* release 5.0.0 ([2599934](https://github.com/netlify/next-runtime/commit/2599934dd0cd6125018992ddee95da390c56bf7f))

## [5.0.0-alpha.25](https://github.com/netlify/next-runtime/compare/v5.0.0-alpha.2...v5.0.0-alpha.25) (2023-11-27)

### Features

* cache tags & on-demand Revalidation for pages ([#50](https://github.com/netlify/next-runtime/issues/50)) ([a6f3ce2](https://github.com/netlify/next-runtime/commit/a6f3ce2652889fca5236c26b88d72932bf2315a6))
* symlink for speed and to avoid clobbering user files ([#56](https://github.com/netlify/next-runtime/issues/56)) ([2576f81](https://github.com/netlify/next-runtime/commit/2576f8108184bc982950627b7667de7f5a202718))

### Bug Fixes

* disable downloading canary swc binaries ([#81](https://github.com/netlify/next-runtime/issues/81)) ([8f3799c](https://github.com/netlify/next-runtime/commit/8f3799c2c534db9defb18ad82ae669781b289223))
* fix patching the fs by doing a shallow clone of fs/promises module to avoid infinite loop ([#73](https://github.com/netlify/next-runtime/issues/73)) ([80b5ea9](https://github.com/netlify/next-runtime/commit/80b5ea9d1f47d9bccb0eec421846e2e2ee3b0f7f))
* fixes a module interop issue ([#67](https://github.com/netlify/next-runtime/issues/67)) ([57b8678](https://github.com/netlify/next-runtime/commit/57b8678349dd6a3348837b8ac28dd04f659d9a7f))
* fixes an issue where the nft tracing was not picking up the runtime node_modules ([#74](https://github.com/netlify/next-runtime/issues/74)) ([fe68c74](https://github.com/netlify/next-runtime/commit/fe68c744e71aed11290ec636f0b41bb72e83f835))
* fixes an issue where the static pages could not be retrieved from the blob store ([#79](https://github.com/netlify/next-runtime/issues/79)) ([e18de13](https://github.com/netlify/next-runtime/commit/e18de1375ba4b60eaa562aed29a679764b25843e))
* fixes the package structure ([#66](https://github.com/netlify/next-runtime/issues/66)) ([b10dad6](https://github.com/netlify/next-runtime/commit/b10dad61c09179ba879f15ba0a2878564beb1054))
* handle dependency paths for packaged module ([a81658c](https://github.com/netlify/next-runtime/commit/a81658c75e4a5914c96dacba1fd6c0a557259e09))
* resolution issue ([#72](https://github.com/netlify/next-runtime/issues/72)) ([f56c28c](https://github.com/netlify/next-runtime/commit/f56c28c86b3d5f98240a9bd018251b3e900c1beb))
* resolving the paths correctly when the next-runtime is used from source ([#77](https://github.com/netlify/next-runtime/issues/77)) ([fcd57d1](https://github.com/netlify/next-runtime/commit/fcd57d1495034566763d769ab6576aed5307ec85))
* revert symlinks to cp due to CLI issues ([#70](https://github.com/netlify/next-runtime/issues/70)) ([85a50d4](https://github.com/netlify/next-runtime/commit/85a50d46cc87306642acefc677bc48bfafeb142d))
* temporary workaround for CDN compression bug ([#80](https://github.com/netlify/next-runtime/issues/80)) ([6b9fa33](https://github.com/netlify/next-runtime/commit/6b9fa3374fe3995f036560321a232a77ff4d858e))
* Update included files within package.json ([#63](https://github.com/netlify/next-runtime/issues/63)) ([ec7c681](https://github.com/netlify/next-runtime/commit/ec7c681c0d825ed38db80f8370fc86011db2ab2a))

### Miscellaneous Chores

* release 5.0.0-alpha.25 ([7088065](https://github.com/netlify/next-runtime/commit/708806592b3d60da4b7433575293914d5a87596c))

## [5.0.0-alpha.2](https://github.com/netlify/next-runtime/compare/v5.0.0-alpha.1...v5.0.0-alpha.2) (2023-11-13)

### Bug Fixes

* don't prepare tests on postinstall ([#61](https://github.com/netlify/next-runtime/issues/61)) ([a095a4c](https://github.com/netlify/next-runtime/commit/a095a4c008cab3f3a6ab2f9645f2974bedf4a753))

## [5.0.0-alpha.1](https://github.com/netlify/next-runtime/compare/v5.0.0-alpha.0...v5.0.0-alpha.1) (2023-11-13)

### Bug Fixes

* requesting page router static assets ([#58](https://github.com/netlify/next-runtime/issues/58)) ([c893ad1](https://github.com/netlify/next-runtime/commit/c893ad17e31ce3912a20f8a22d476c2937a81a99))

### Miscellaneous Chores

* release 5.0.0-alpha.0 ([aaf9085](https://github.com/netlify/next-runtime/commit/aaf9085a71280c5f9f0a2c45c8f01f7723015baf))
* release 5.0.0-alpha.1 ([f968b62](https://github.com/netlify/next-runtime/commit/f968b620ac8af22c04eab5c57d30fdbcf255b990))

## [5.0.0-alpha.0](https://github.com/netlify/next-runtime/compare/v5.0.0-alpha.0...v5.0.0-alpha.0) (2023-11-13)

### Bug Fixes

* requesting page router static assets ([#58](https://github.com/netlify/next-runtime/issues/58)) ([c893ad1](https://github.com/netlify/next-runtime/commit/c893ad17e31ce3912a20f8a22d476c2937a81a99))

### Miscellaneous Chores

* release 5.0.0-alpha.0 ([aaf9085](https://github.com/netlify/next-runtime/commit/aaf9085a71280c5f9f0a2c45c8f01f7723015baf))

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

* **Standalone mode:** The Next Runtime now builds Next.js sites in standalone mode, which means the
  Next Runtime no longer needs to trace and package server files/dependencies and we can instead
  rely on the framework. In addition, it exposes a server entrypoint that allows us to handle
  requests in a more reliable way, meaning we are less exposed to changes in Next.js internals.
* **Cache handling:** We are making use of a new Next.js configuration parameter that allows us to
  specify a custom cache handler. This is a huge leap forward because it allows us to leverage
  Netlify's new `Cache-Control` primitives and retire the use of ODBs, which are no longer suitable
  for dealing with the advanced caching requirements of modern Next.js sites. The new Next Runtime
  forwards Next.js `Cache-Control` headers and specifically ensures that `stale-while-revalidate` is
  handled by our edge CDN and does not leak to the browser. In addition, the runtime sets
  appropriate `Vary` and `Cache-Tags` headers according to the Next.js response.
* **Blob storage** To support globally persistent static revalidation, the Next Runtime makes use of
  Netlify's new blob storage primitive. Page content and metadata is cached in the blob store,
  meaning that the same content version is available to all lambda invocations and can be
  automatically (TTL) or manually (on-demand) revalidated across all CDN nodes.
* **Functions API v2** The server handler utilizes the new Netlify Functions API, which means we are
  now receiving/returning a standard web Request/Response object and no longer need to bridge
  between a Lambda event and a Node event by standing up an HTTP server on each request. In
  addition, the new configuration API means we will no longer need to modify the Netlify TOML file
  and can avoid modifying any user code or Next.js build output for better DX.
