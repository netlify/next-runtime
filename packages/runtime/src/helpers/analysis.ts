import fs from 'fs'

import { extractExportedConstValue, UnsupportedValueError } from 'next/dist/build/analysis/extract-const-value'
import { parseModule } from 'next/dist/build/analysis/parse-module'
import { relative } from 'pathe'

export interface ApiStandardConfig {
  type?: never
  runtime?: 'nodejs' | 'experimental-edge'
  schedule?: never
}

export interface ApiScheduledConfig {
  type: 'experimental-scheduled'
  runtime?: 'nodejs'
  schedule: string
}

export interface ApiBackgroundConfig {
  type: 'experimental-background'
  runtime?: 'nodejs'
  schedule?: never
}

export type ApiConfig = ApiStandardConfig | ApiScheduledConfig | ApiBackgroundConfig

export const validateConfigValue = (config: ApiConfig, apiFilePath: string): config is ApiConfig => {
  if (config.type === 'experimental-scheduled') {
    if (!config.schedule) {
      console.error(
        `Invalid config value in ${relative(
          process.cwd(),
          apiFilePath,
        )}: schedule is required when type is "experimental-scheduled"`,
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

  if (!config.type || config.type === 'experimental-background') {
    if (config.schedule) {
      console.error(
        `Invalid config value in ${relative(
          process.cwd(),
          apiFilePath,
        )}: schedule is not allowed unless type is "experimental-scheduled"`,
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
