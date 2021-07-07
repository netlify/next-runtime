// Does the build command include this value, either directly or via an npm script?
const usesBuildCommand = ({ build, scripts, command }) => {
  if (!build.command) return false

  if (build.command.includes(command)) {
    return true
  }

  return Object.entries(scripts).some(
    // Search for a npm script that is being called by the build command, and includes the searched-for command
    ([scriptName, scriptValue]) => build.command.includes(scriptName) && scriptValue.includes(command),
  )
}

module.exports = usesBuildCommand
