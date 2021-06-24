const { existsSync } = require('fs')
const path = require('path')

const getNextRoot = ({ netlifyConfig }) => {
  let nextRoot = process.cwd()
  if (!existsSync(path.join(nextRoot, 'next.config.js')) && netlifyConfig.build.publish) {
    nextRoot = path.dirname(netlifyConfig.build.publish)
  }
  return nextRoot
}

module.exports = getNextRoot
