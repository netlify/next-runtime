const { readdirSync, existsSync } = require('fs')
const path = require('path')

const makeDir = require('make-dir')
const { satisfies } = require('semver')

const { restoreCache, saveCache } = require('./helpers/cacheBuild')
const checkNxConfig = require('./helpers/checkNxConfig')
const copyUnstableIncludedDirs = require('./helpers/copyUnstableIncludedDirs')
const doesNotNeedPlugin = require('./helpers/doesNotNeedPlugin')
const getNextConfig = require('./helpers/getNextConfig')
const getNextRoot = require('./helpers/getNextRoot')
const validateNextUsage = require('./helpers/validateNextUsage')
const verifyBuildTarget = require('./helpers/verifyBuildTarget')
const nextOnNetlify = require('./src')

// This is when the esbuild dynamic import support was added
const REQUIRED_BUILD_VERSION = '>=15.11.5'

// * Helpful Plugin Context *
// - Between the prebuild and build steps, the project's build command is run
// - Between the build and postbuild steps, any functions are bundled

module.exports = {
  async onPreBuild({ netlifyConfig, packageJson, utils, constants = {} }) {
    const { failBuild } = utils.build

    validateNextUsage({ failBuild, netlifyConfig })

    const hasNoPackageJson = Object.keys(packageJson).length === 0
    if (hasNoPackageJson) {
      return failBuild('Could not find a package.json for this project')
    }

    if (doesNotNeedPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }
    // We check for build version because that's what's available to us, but prompt about the cli because that's what they can upgrade
    if (constants.IS_LOCAL && !satisfies(constants.NETLIFY_BUILD_VERSION, REQUIRED_BUILD_VERSION)) {
      return failBuild(
        `This version of the Essential Next.js plugin requires netlify-cli@4.4.2 or higher. Please upgrade and try again.
You can do this by running: "npm install -g netlify-cli@latest" or "yarn global add netlify-cli@latest"`,
      )
    }

    // Populates the correct config if needed
    await verifyBuildTarget({ netlifyConfig, packageJson, failBuild })
    const nextRoot = getNextRoot({ netlifyConfig })

    // Because we memoize nextConfig, we need to do this after the write file
    const nextConfig = await getNextConfig(utils.failBuild, nextRoot)

    // Nx needs special config handling, so check for it specifically
    const isNx = Boolean(
      (packageJson.devDependencies && packageJson.devDependencies['@nrwl/next']) ||
        (packageJson.dependencies && packageJson.dependencies['@nrwl/next']),
    )

    if (isNx) {
      console.log('Detected Nx site. Checking configuration...')
      checkNxConfig({ netlifyConfig, packageJson, nextConfig, failBuild, constants })
    }

    if (process.env.NEXT_IMAGE_ALLOWED_DOMAINS) {
      console.log(
        `The Essential Next.js plugin now supports reading image domains from your Next config, so using NEXT_IMAGE_ALLOWED_DOMAINS is now deprecated. Please set images.domains in next.config.js instead, and remove the NEXT_IMAGE_ALLOWED_DOMAINS variable.`,
      )
    }
    await restoreCache({ cache: utils.cache, distDir: nextConfig.distDir, nextRoot })

    // Exit the build process on unhandled promise rejection. This is the default in Node 15+, but earlier versions just warn.
    // This causes problems as it doesn't then know the build has failed until we try to copy the assets.
    process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, '--unhandled-rejections=strict'].filter(Boolean).join(' ')
  },
  async onBuild({
    netlifyConfig,
    packageJson,
    constants: { PUBLISH_DIR = DEFAULT_PUBLISH_DIR, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC },
    utils,
  }) {
    const { failBuild } = utils.build

    const nextRoot = getNextRoot({ netlifyConfig })

    if (doesNotNeedPlugin({ netlifyConfig, packageJson, failBuild })) {
      return
    }
    console.log('Detected Next.js site. Copying files...')

    const { distDir, configFile } = await getNextConfig(failBuild, nextRoot)
    const dist = path.resolve(nextRoot, distDir)

    if (!existsSync(dist)) {
      failBuild(`
Could not find "${distDir}" after building the site, which indicates that "next build" was not run or that we're looking in the wrong place. 
We're using the config file ${configFile}, and looking for the dist directory at ${dist}. If this is incorrect, try deleting the config file, or
moving it to the correct place. Check that your build command includes "next build". If the site is a monorepo, see https://ntl.fyi/next-monorepo 
for information on configuring the site. If this is not a Next.js site, or if it uses static export, you should remove the Essential Next.js plugin. 
See https://ntl.fyi/remove-plugin for instructions.
      `)
    }

    console.log(`** Running Next on Netlify package **`)

    await makeDir(PUBLISH_DIR)
    await nextOnNetlify({
      functionsDir: path.resolve(FUNCTIONS_SRC),
      publishDir: netlifyConfig.build.publish || PUBLISH_DIR,
      nextRoot,
    })
  },

  async onPostBuild({ netlifyConfig, packageJson, constants: { FUNCTIONS_DIST = DEFAULT_FUNCTIONS_DIST }, utils }) {
    if (doesNotNeedPlugin({ netlifyConfig, packageJson, utils })) {
      utils.status.show({
        title: 'Essential Next.js Build Plugin did not run',
        summary: netlifyConfig.build.command
          ? 'The site either uses static export, manually runs next-on-netlify, or is not a Next.js site'
          : 'The site config does not specify a build command',
      })
      return
    }
    const nextRoot = getNextRoot({ netlifyConfig })

    const nextConfig = await getNextConfig(utils.failBuild, nextRoot)
    await saveCache({ cache: utils.cache, distDir: nextConfig.distDir, nextRoot })
    copyUnstableIncludedDirs({ nextConfig, functionsDist: path.resolve(FUNCTIONS_DIST) })
    utils.status.show({
      title: 'Essential Next.js Build Plugin ran successfully',
      summary: 'Generated serverless functions and stored the Next.js cache',
    })
  },
}

const DEFAULT_FUNCTIONS_SRC = 'netlify/functions'
const DEFAULT_FUNCTIONS_DIST = '.netlify/functions/'
const DEFAULT_PUBLISH_DIR = 'out'
