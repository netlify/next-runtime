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
      `Static export detection disabled because we could not parse your build command: ${error.message}
The build command is "${build.command}" and the available npm scripts are: ${Object.keys(scripts)
        .map((script) => `"${script}"`)
        .join(', ')}

If the site does use static export then you can set the env var NEXT_PLUGIN_FORCE_RUN to "false" or uninstall the plugin. See https://ntl.fyi/remove-plugin for instructions.`,
    )
  }
}

module.exports = usesBuildCommand
