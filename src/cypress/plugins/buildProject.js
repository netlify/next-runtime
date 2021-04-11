const { join } = require('path')

const execa = require('execa')

// Build the given NextJS project
const buildProject = ({ project }, config) => {
  process.stdout.write(`Building project: ${project}...`)

  // Build project
  execa.sync('npm', ['run', 'build'], {
    cwd: join(config.buildsFolder, project),
    preferLocal: true,
  })

  console.log(' Done! ✅')
  return true
}

module.exports = buildProject
