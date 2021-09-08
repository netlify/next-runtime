const { existsSync } = require('fs')
const path = require('path')

/**
 * If we're in a monorepo then the Next root may not be the same as the base directory
 * If there's no next.config.js in the root, we instead look for it as a sibling of the publish dir
 */
const getNextRoot = ({ netlifyConfig }) => {
  let nextRoot = process.cwd()
  if (
    !existsSync(path.join(nextRoot, 'next.config.js')) &&
    netlifyConfig.build.publish &&
    netlifyConfig.build.publish !== nextRoot
  ) {
    nextRoot = path.dirname(netlifyConfig.build.publish)
  }
  return nextRoot
}

module.exports = getNextRoot
