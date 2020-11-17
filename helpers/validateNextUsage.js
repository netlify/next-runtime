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
}

const hasPackage = function (packageName) {
  try {
    require(packageName)
    return true
  } catch (error) {
    return false
  }
}

module.exports = validateNextUsage
