const { join } = require('path')
const { emptyDirSync } = require('fs-extra')

// Clear the project
const clearProject = ({ project }, config) => {
  emptyDirSync(join(config.buildsFolder, project))
  emptyDirSync(join(config.buildsFolder, project, 'pages'))
  emptyDirSync(join(config.buildsFolder, project, '.netlify'))

  return true
}

module.exports = clearProject
