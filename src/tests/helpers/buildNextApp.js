// Build a NextJS app with the provided elements (pages, config file, ...)
// Inspired by netlify-cli siteBuilder:
// https://github.com/netlify/cli/blob/master/tests/utils/siteBuilder.js

const { join, parse } = require('path')
const { copySync, emptyDirSync, existsSync } = require('fs-extra')
const { hashElement } = require('folder-hash')
const npmRun = require('./npmRun')
const { NEXT_VERSION } = require('./nextVersion')

// The NextAppBuilder has three phases:
// 1. Adding files (NextJS pages, config files, etc...) to a staging folder
// 2. Building the NextJS app and caching the output in a cache folder
// 3. Moving the files to an app folder and running next-on-netlify
//
// After phase 1, we generate a hash over the contents of the staging folder.
// We check if we already have a cached NextJS build with this hash for the
// current version of NextJS. If so, we skip the (slow) NextJS build and just
// run next-on-netlify.

class NextAppBuilder {
  // Set the application name. This determines the build path.
  forTest(testFile) {
    this.__appName = parse(testFile).name

    // Clear staging and app directory
    emptyDirSync(this.__stagingPath)
    emptyDirSync(this.__appPath)

    return this.withFile('.eslintrc')
  }

  // Copy the fixture folder with the pagesFolder name to
  // /staging/<appName>/pages
  withPages(pagesFolder) {
    return this.withFile(pagesFolder, 'pages')
  }

  // Copy the fixture configFile to /staging/<appName>/next.config.js
  withNextConfig(configFile) {
    return this.withFile(configFile, 'next.config.js')
  }

  // Copy the fixture package file to /staging/<appName>/package.json
  withPackageJson(packageJsonFile) {
    return this.withFile(packageJsonFile, 'package.json')
  }

  withCustomFunctions(functionsDir) {
    return this.withFile(functionsDir)
  }

  withFileTracking() {
    return this.withFile('.nonfiletracking', join('node_modules', '.cache', 'next-on-netlify', '.nonfiletracking'))
  }

  // Copy a file from the fixtures folder to the app's staging folder
  withFile(fixture, target = null) {
    // If no target file name is given, use the same name as the fixture
    target = target || fixture

    // Copy the file
    copySync(join(__dirname, '..', 'fixtures', fixture), join(this.__stagingPath, target))

    // Return the builder for chaining
    return this
  }

  async buildNextApp() {
    // Generate a cache hash ID from the current contents of the staging folder.
    const { hash: cacheHash } = await hashElement(this.__stagingPath, {
      encoding: 'hex',
    })
    this.__cacheHash = cacheHash

    // If we have no cached build for this NextJS app, let's run next build and
    // cache the result
    if (!existsSync(this.__cachePath)) {
      // Build the nextJS app
      await npmRun('next-build', this.__stagingPath)

      // Cache the build
      copySync(this.__stagingPath, this.__cachePath)
    }

    // Copy the built NextJS app from the cache to the app folder, where we will
    // run next-on-netlify
    copySync(this.__cachePath, this.__appPath)

    process.chdir(this.__appPath)
  }

  async build() {
    await this.buildNextApp()

    // Run next-on-netlify as postbuild script
    const { stdout } = await npmRun('next-on-netlify', this.__appPath)
    return stdout
  }

  async runWithRequire(options) {
    await this.buildNextApp()

    // Run next-on-netlify as an imported module
    const nextOnNetlify = require('../..')
    await nextOnNetlify({
      functionsDir: join(this.__appPath, options.functionsDir),
      publishDir: join(this.__appPath, options.publishDir),
    })
    return 'Built successfully!'
  }

  /*****************************************************************************
   * Private functions
   ****************************************************************************/

  // The path where we stage pages and config files prior to invoking next build
  get __stagingPath() {
    return join(__dirname, '..', 'builds', '_staging', this.__appName)
  }

  get __cachePath() {
    return join(__dirname, '..', 'builds', '_cache', `next-v${NEXT_VERSION}`, this.__cacheHash)
  }

  get __appPath() {
    return join(__dirname, '..', 'builds', this.__appName)
  }
}

const buildNextApp = () => {
  return new NextAppBuilder()
}

module.exports = buildNextApp
