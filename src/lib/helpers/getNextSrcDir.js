const { join } = require('path')

const getNextSrcDirs = () => {
  return ['pages', 'src', 'public', 'styles'].map((dir) => join('.', dir))
}

module.exports = getNextSrcDirs
