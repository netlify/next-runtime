const execa = require('execa')

// Run the given npm command from the given directory
const npmRun = async (command, fromDirectory) => {
  // Execute the command
  try {
    return await execa('npm', ['run', command], {
      cwd: fromDirectory,
      preferLocal: true,
    })
  } catch (error) {
    throw new Error(`An error occurred during "npm run ${command}" in ${fromDirectory}: ${error.message}`)
  }
}

module.exports = npmRun
