const parseNpmScript = require('@netlify/parse-npm-script')

const COMMAND_PLACEHOLDER = '___netlifybuildcommand'

// Does the build command include this value, either directly or via an npm script?
const usesBuildCommand = ({ build, scripts, command }) => {
  if (!build.command) return false

  if (build.command.includes(command)) {
    return true
  }

  if (!build.command.includes('npm run') && !build.command.includes('yarn')) {
    return false
  }

  // Insert a fake script to represent the build command

  const commands = { ...scripts, [COMMAND_PLACEHOLDER]: build.command }

  // This resolves the npm script that is actually being run
  try {
    const { raw } = parseNpmScript({ scripts: commands }, COMMAND_PLACEHOLDER)
    return raw.some((script) => script.includes(command))
  } catch (error) {
    console.error(
      'There was an error parsing your build command:',
      error.message,
      `\n\nThe build command is "${build.command}" and the available npm scripts are: ${Object.keys(scripts)
        .map((script) => `"${script}"`)
        .join(', ')}`,
    )
  }
}

module.exports = usesBuildCommand
