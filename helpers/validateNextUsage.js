const { lt: ltVersion, gte: gteVersion } = require('semver')
const { yellowBright } = require('chalk')

// Ensure Next.js is available.
// We use `peerDependencies` instead of `dependencies` so that users can choose
// the Next.js version. However, this requires them to install "next" in their
// site.
const validateNextUsage = function (failBuild) {
  if (!hasPackage('next')) {
    return failBuild(
      'This site does not seem to be using Next.js. Please run "npm install next" or "yarn next" in the repository.',
    )
  }

  // Old Next.js versions are not supported
  const { version } = require('next/package.json')
  if (ltVersion(version, MIN_VERSION)) {
    return failBuild(`Please upgrade to Next.js ${MIN_VERSION} or later`)
  }

  // Recent Next.js versions are sometimes unstable and we might not officially
  // support them yet. However, they might still work for some users, so we
  // only print a warning
  if (gteVersion(version, MIN_EXPERIMENTAL_VERSION)) {
    console.log(yellowBright(`** Warning: support for Next.js >=${MIN_EXPERIMENTAL_VERSION} is experimental **`))
  }
}

const MIN_VERSION = '9.5.3'
const MIN_EXPERIMENTAL_VERSION = '11.0.0'

const hasPackage = function (packageName) {
  try {
    require(`${packageName}/package.json`)
    return true
  } catch (error) {
    return false
  }
}

module.exports = validateNextUsage
