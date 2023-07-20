import fs, { existsSync } from 'fs'

import { relative } from 'pathe'

import logger from './logger'
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
      logger.error(
        `Invalid config value in ${relative(process.cwd(), apiFilePath)}: schedule is required when type is "${
          ApiRouteType.SCHEDULED
        }"`,
      )
      return false
    }
    if (isEdgeConfig((config as ApiConfig).runtime)) {
      logger.error(
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
      logger.error(
        `Invalid config value in ${relative(process.cwd(), apiFilePath)}: schedule is not allowed unless type is "${
          ApiRouteType.SCHEDULED
        }"`,
      )
      return false
    }
    if (config.type && isEdgeConfig((config as ApiConfig).runtime)) {
      logger.error(
        `Invalid config value in ${relative(
          process.cwd(),
          apiFilePath,
        )}: edge runtime is not supported for background functions`,
      )
      return false
    }
    return true
  }
  logger.error(
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

  const extractConstValueModulePath = findModuleFromBase({
    paths: [appDir],
    candidates: ['next/dist/build/analysis/extract-const-value'],
  })

  const parseModulePath = findModuleFromBase({
    paths: [appDir],
    candidates: ['next/dist/build/analysis/parse-module'],
  })

  if (!extractConstValueModulePath || !parseModulePath) {
    if (!hasWarnedAboutNextVersion) {
      logger.log("This version of Next.js doesn't support advanced API routes. Skipping...")
      hasWarnedAboutNextVersion = true
    }
    // Old Next.js version
    return {}
  }

  if (!extractConstValue && extractConstValueModulePath) {
    // eslint-disable-next-line import/no-dynamic-require
    extractConstValue = require(extractConstValueModulePath)
  }
  if (!parseModule && parseModulePath) {
    // eslint-disable-next-line prefer-destructuring, @typescript-eslint/no-var-requires, import/no-dynamic-require
    parseModule = require(parseModulePath).parseModule
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
      logger.warn(`Unsupported config value in ${relative(process.cwd(), apiFilePath)}`)
    }
    return {}
  }
  if (validateConfigValue(config, apiFilePath)) {
    return config
  }
  throw new Error(`Unsupported config value in ${relative(process.cwd(), apiFilePath)}`)
}
