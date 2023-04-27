import fs, { existsSync } from 'fs'

import { relative } from 'pathe'

import { ApiRouteType } from './types'
import { findModuleFromBase } from './utils'

export interface ApiStandardConfig {
  type?: never
  runtime?: 'nodejs' | 'experimental-edge' | 'edge'
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

export const isEdgeConfig = (config: string) => ['experimental-edge', 'edge'].includes(config)

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
    if (isEdgeConfig((config as ApiConfig).runtime)) {
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
    if (config.type && isEdgeConfig((config as ApiConfig).runtime)) {
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

let extractConstValue
let parseModule
let hasWarnedAboutNextVersion = false
/**
 * Uses Next's swc static analysis to extract the config values from a file.
 */
export const extractConfigFromFile = async (apiFilePath: string, appDir: string): Promise<ApiConfig> => {
  if (!apiFilePath || !existsSync(apiFilePath)) {
    return {}
  }

  try {
    if (!extractConstValue) {
      // eslint-disable-next-line import/no-dynamic-require
      extractConstValue = require(findModuleFromBase({
        paths: [appDir],
        candidates: ['next/dist/build/analysis/extract-const-value'],
      }))
    }
    if (!parseModule) {
      // eslint-disable-next-line prefer-destructuring, @typescript-eslint/no-var-requires, import/no-dynamic-require
      parseModule = require(findModuleFromBase({
        paths: [appDir],
        candidates: ['next/dist/build/analysis/parse-module'],
      })).parseModule
    }
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      if (!hasWarnedAboutNextVersion) {
        console.log("This version of Next.js doesn't support advanced API routes. Skipping...")
        hasWarnedAboutNextVersion = true
      }
      // Old Next.js version
      return {}
    }
    throw error
  }

  const { extractExportedConstValue, UnsupportedValueError } = extractConstValue

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
    if (UnsupportedValueError && error instanceof UnsupportedValueError) {
      console.warn(`Unsupported config value in ${relative(process.cwd(), apiFilePath)}`)
    }
    return {}
  }
  if (validateConfigValue(config, apiFilePath)) {
    return config
  }
  throw new Error(`Unsupported config value in ${relative(process.cwd(), apiFilePath)}`)
}
