import { existsSync, readJSON, writeFile } from 'fs-extra'
import { join } from 'pathe'

import { NEXT_PLUGIN, NEXT_PLUGIN_NAME } from '../constants'

import { resolveModuleRoot } from './config'

const getNextRuntimeVersion = async (packageJsonPath: string, useNodeModulesPath: boolean) => {
  if (!existsSync(packageJsonPath)) {
    return
  }

  const packagePlugin = await readJSON(packageJsonPath)

  return useNodeModulesPath ? packagePlugin.version : packagePlugin.dependencies[NEXT_PLUGIN]
}

// Getting the path to the nextjs-plugin package.json file
const nodeModulesPath = resolveModuleRoot(NEXT_PLUGIN) ? join(resolveModuleRoot(NEXT_PLUGIN), 'package.json') : null
const pluginPackagePath = '.netlify/plugins/package.json'

// The information needed to create a function configuration file
export interface FunctionInfo {
  // The name of the function, e.g. `___netlify-handler`
  functionName: string

  // The name of the function that will be displayed in logs, e.g. `Next.js SSR handler`
  functionTitle: string

  // The directory where the function is located, e.g. `.netlify/functions`
  functionsDir: string
}

/**
 * Creates a function configuration file for the given function.
 *
 * @param functionInfo The information needed to create a function configuration file
 */
export const writeFunctionConfiguration = async (functionInfo: FunctionInfo) => {
  const { functionName, functionTitle, functionsDir } = functionInfo

  const nextPluginVersion =
    (await getNextRuntimeVersion(nodeModulesPath, true)) ||
    (await getNextRuntimeVersion(pluginPackagePath, false)) ||
    // The runtime version should always be available, but if it's not, return 'unknown'
    'unknown'

  const metadata = {
    config: {
      name: functionTitle,
      generator: `${NEXT_PLUGIN_NAME}@${nextPluginVersion}`,
    },
    version: 1,
  }

  await writeFile(join(functionsDir, functionName, `${functionName}.json`), JSON.stringify(metadata))
}

export const writeEdgeFunctionConfiguration = async () => {
  const nextPluginVersion =
    (await getNextRuntimeVersion(nodeModulesPath, true)) ||
    (await getNextRuntimeVersion(pluginPackagePath, false)) ||
    // The runtime version should always be available, but if it's not, return 'unknown'
    'unknown'

  return `${NEXT_PLUGIN_NAME}@${nextPluginVersion}`
}
