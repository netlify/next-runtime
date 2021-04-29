const { join } = require('path')

const getNextSrcDirs = () => ['pages', 'src', 'public', 'styles'].map((dir) => join('.', dir))

module.exports = getNextSrcDirs
