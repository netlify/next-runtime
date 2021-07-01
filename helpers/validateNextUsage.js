const { yellowBright } = require('chalk')
const { lt: ltVersion, gte: gteVersion } = require('semver')

const getNextRoot = require('./getNextRoot')
const resolveNextModule = require('./resolveNextModule')

// Ensure Next.js is available.
// We use `peerDependencies` instead of `dependencies` so that users can choose
// the Next.js version. However, this requires them to install "next" in their
// site.
const validateNextUsage = function ({ failBuild, netlifyConfig }) {
  const nextRoot = getNextRoot({ netlifyConfig })
  //  Because we don't know the monorepo structure, we try to resolve next both locally and in the next root
  if (!hasPackage('next', nextRoot)) {
    return failBuild(
      `This site does not seem to be using Next.js. Please run "npm install next" in the repository.
If you are using a monorepo, please see the docs on configuring your site: https://ntl.fyi/next-monorepos`,
    )
  }

  // We cannot load `next` at the top-level because we validate whether the
  // site is using `next` inside `onPreBuild`.
  // Old Next.js versions are not supported
  // eslint-disable-next-line import/no-dynamic-require
  const { version } = require(resolveNextModule(`next/package.json`, nextRoot))

  console.log(`Using Next.js ${yellowBright(version)}`)

  if (ltVersion(version, MIN_VERSION)) {
    return failBuild(`Please upgrade to Next.js ${MIN_VERSION} or later.`)
  }

  // Recent Next.js versions are sometimes unstable and we might not officially
  // support them yet. However, they might still work for some users, so we
  // only print a warning
  if (gteVersion(version, MIN_EXPERIMENTAL_VERSION)) {
    console.log(yellowBright(`Warning: support for Next.js >=${MIN_EXPERIMENTAL_VERSION} is experimental`))
  }
}

const MIN_VERSION = '10.0.6'
const MIN_EXPERIMENTAL_VERSION = '11.1.0'

const hasPackage = function (packageName, nextRoot) {
  try {
    resolveNextModule(`${packageName}/package.json`, nextRoot)
    return true
  } catch (error) {
    return false
  }
}

module.exports = validateNextUsage
