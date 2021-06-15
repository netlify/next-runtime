const { join } = require('path')
const build = require('@netlify/build')

// Build the given NextJS project
const buildProject = async ({ project }, config) => {
  process.stdout.write(`Building project: ${project}...`)
  // Build project
  const { success } = await build({ cwd: join(config.buildsFolder, project), testOpts: { testEnv: false } })

  if (!success) {
    console.error('Failed to build!')
    return false
  }
  console.log(' Done! ✅')
  return true
}

module.exports = buildProject
