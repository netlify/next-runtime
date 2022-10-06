import fs from 'fs'

import { extractExportedConstValue, UnsupportedValueError } from 'next/dist/build/analysis/extract-const-value'
import { parseModule } from 'next/dist/build/analysis/parse-module'
import { relative } from 'pathe'

// I have no idea what eslint is up to here but it gives an error
// eslint-disable-next-line no-shadow
export const enum ApiRouteType {
  SCHEDULED = 'experimental-scheduled',
  BACKGROUND = 'experimental-background',
}

export interface ApiStandardConfig {
  type?: never
  runtime?: 'nodejs' | 'experimental-edge'
  schedule?: never
}

export interface ApiScheduledConfig {
  type: ApiRouteType.SCHEDULED
  runtime?: 'nodejs'
  schedule: string
}

export interface ApiBackgroundConfig {
  type: ApiRouteType.BACKGROUND
  runtime?: 'nodejs'
  schedule?: never
}

export type ApiConfig = ApiStandardConfig | ApiScheduledConfig | ApiBackgroundConfig

export const validateConfigValue = (config: ApiConfig, apiFilePath: string): config is ApiConfig => {
  if (config.type === ApiRouteType.SCHEDULED) {
    if (!config.schedule) {
      console.error(
        `Invalid config value in ${relative(process.cwd(), apiFilePath)}: schedule is required when type is "${
          ApiRouteType.SCHEDULED
        }"`,
      )
      return false
    }
    if ((config as ApiConfig).runtime === 'experimental-edge') {
      console.error(
        `Invalid config value in ${relative(
          process.cwd(),
          apiFilePath,
        )}: edge runtime is not supported for scheduled functions`,
      )
      return false
    }
    return true
  }

  if (!config.type || config.type === ApiRouteType.BACKGROUND) {
    if (config.schedule) {
      console.error(
        `Invalid config value in ${relative(process.cwd(), apiFilePath)}: schedule is not allowed unless type is "${
          ApiRouteType.SCHEDULED
        }"`,
      )
      return false
    }
    if (config.type && (config as ApiConfig).runtime === 'experimental-edge') {
      console.error(
        `Invalid config value in ${relative(
          process.cwd(),
          apiFilePath,
        )}: edge runtime is not supported for background functions`,
      )
      return false
    }
    return true
  }
  console.error(
    `Invalid config value in ${relative(process.cwd(), apiFilePath)}: type ${
      (config as ApiConfig).type
    } is not supported`,
  )
  return false
}

/**
 * Uses Next's swc static analysis to extract the config values from a file.
 */
export const extractConfigFromFile = async (apiFilePath: string): Promise<ApiConfig> => {
  const fileContent = await fs.promises.readFile(apiFilePath, 'utf8')
  // No need to parse if there's no "config"
  if (!fileContent.includes('config')) {
    return {}
  }
  const ast = await parseModule(apiFilePath, fileContent)

  let config: ApiConfig
  try {
    config = extractExportedConstValue(ast, 'config')
  } catch (error) {
    if (error instanceof UnsupportedValueError) {
      console.warn(`Unsupported config value in ${relative(process.cwd(), apiFilePath)}`)
    }
    return {}
  }
  if (validateConfigValue(config, apiFilePath)) {
    return config
  }
  throw new Error(`Unsupported config value in ${relative(process.cwd(), apiFilePath)}`)
}
