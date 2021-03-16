// Takes 1. Netlify config's build details and
// 2. the project's package.json scripts to determine if
// the Next.js app uses static HTML export
const isStaticExportProject = ({ build, scripts }) => {
  const NEXT_EXPORT_COMMAND = 'next export'

  if (!build.command) return false

  const isSetInNetlifyConfig = build.command.includes(NEXT_EXPORT_COMMAND)

  const isSetInNpmScript = Object.keys(scripts).find((script) => {
    const scriptValue = scripts[script]
    return build.command.includes(script) && scriptValue.includes(NEXT_EXPORT_COMMAND)
  })
  return isSetInNetlifyConfig || isSetInNpmScript
}

module.exports = isStaticExportProject
