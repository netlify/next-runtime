import { readJSON } from 'fs-extra'
import { join, dirname, relative } from 'pathe'
import slash from 'slash'

import { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } from '../constants'

import { RequiredServerFiles } from './requiredServerFilesType'

const defaultFailBuild = (message: string, { error }): never => {
  throw new Error(`${message}\n${error && error.stack}`)
}

export const getNextConfig = async function getNextConfig({ publish, failBuild = defaultFailBuild }) {
  try {
    const { config, appDir, ignore }: RequiredServerFiles = await readJSON(join(publish, 'required-server-files.json'))
    if (!config) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return failBuild('Error loading your Next config')
    }
    return { ...config, appDir, ignore }
  } catch (error: unknown) {
    return failBuild('Error loading your Next config', { error })
  }
}

const resolveModuleRoot = (moduleName) => {
  try {
    return dirname(relative(process.cwd(), require.resolve(`${moduleName}/package.json`, { paths: [process.cwd()] })))
  } catch (error) {
    return null
  }
}

const DEFAULT_EXCLUDED_MODULES = ['sharp', 'electron']

export const configureHandlerFunctions = ({ netlifyConfig, publish, ignore = [] }) => {
  /* eslint-disable no-underscore-dangle */
  netlifyConfig.functions._ipx ||= {}
  netlifyConfig.functions._ipx.node_bundler = 'nft'
  /* eslint-enable no-underscore-dangle */
  ;[HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME].forEach((functionName) => {
    netlifyConfig.functions[functionName] ||= { included_files: [], external_node_modules: [] }
    netlifyConfig.functions[functionName].node_bundler = 'nft'
    netlifyConfig.functions[functionName].included_files ||= []
    netlifyConfig.functions[functionName].included_files.push(
      '.env',
      '.env.local',
      '.env.production',
      '.env.production.local',
      `${publish}/server/**`,
      `${publish}/serverless/**`,
      `${publish}/*.json`,
      `${publish}/BUILD_ID`,
      `${publish}/static/chunks/webpack-middleware*.js`,
      `!${publish}/server/**/*.js.nft.json`,
      ...ignore.map((path) => `!${slash(path)}`),
    )

    const nextRoot = resolveModuleRoot('next')
    if (nextRoot) {
      netlifyConfig.functions[functionName].included_files.push(
        `!${nextRoot}/dist/server/lib/squoosh/**/*.wasm`,
        `!${nextRoot}/dist/next-server/server/lib/squoosh/**/*.wasm`,
        `!${nextRoot}/dist/compiled/webpack/bundle4.js`,
        `!${nextRoot}/dist/compiled/webpack/bundle5.js`,
        `!${nextRoot}/dist/compiled/terser/bundle.min.js`,
      )
    }

    DEFAULT_EXCLUDED_MODULES.forEach((moduleName) => {
      const moduleRoot = resolveModuleRoot(moduleName)
      if (moduleRoot) {
        netlifyConfig.functions[functionName].included_files.push(`!${moduleRoot}/**/*`)
      }
    })
  })
}
