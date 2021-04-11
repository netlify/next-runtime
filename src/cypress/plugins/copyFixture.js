const { join } = require('path')

const { copySync } = require('fs-extra')

// Copy the fixture files from fixtures/ to the project folder
const copyFixture = ({ project, from, to }, config) => {
  copySync(join(config.fixturesFolder, from), join(config.buildsFolder, project, to))

  return true
}

module.exports = copyFixture
