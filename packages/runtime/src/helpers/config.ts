import type { NetlifyConfig } from '@netlify/build'
import { readJSON, writeJSON } from 'fs-extra'
import type { Header } from 'next/dist/lib/load-custom-routes'
import type { NextConfigComplete } from 'next/dist/server/config-shared'
import { join, dirname, relative } from 'pathe'
import slash from 'slash'

import { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME } from '../constants'

import type { RoutesManifest } from './types'

const ROUTES_MANIFEST_FILE = 'routes-manifest.json'

type NetlifyHeaders = NetlifyConfig['headers']

export interface RequiredServerFiles {
  version?: number
  config?: NextConfigComplete
  appDir?: string
  files?: string[]
  ignore?: string[]
}

export type NextConfig = Pick<RequiredServerFiles, 'appDir' | 'ignore'> &
  NextConfigComplete & {
    routesManifest?: RoutesManifest
  }

const defaultFailBuild = (message: string, { error }): never => {
  throw new Error(`${message}\n${error && error.stack}`)
}

export const getNextConfig = async function getNextConfig({
  publish,
  failBuild = defaultFailBuild,
}): Promise<NextConfig> {
  try {
    const { config, appDir, ignore }: RequiredServerFiles = await readJSON(join(publish, 'required-server-files.json'))
    if (!config) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return failBuild('Error loading your Next config')
    }

    const routesManifest: RoutesManifest = await readJSON(join(publish, ROUTES_MANIFEST_FILE))

    // If you need access to other manifest files, you can add them here as well
    return { ...config, appDir, ignore, routesManifest }
  } catch (error: unknown) {
    return failBuild('Error loading your Next config', { error })
  }
}

/**
 * Returns all of the NextJS configuration stored within 'required-server-files.json'
 * To update the configuration within this file, use the 'updateRequiredServerFiles' method.
 */
export const getRequiredServerFiles = async (publish: string): Promise<RequiredServerFiles> => {
  const configFile = join(publish, 'required-server-files.json')
  return await readJSON(configFile)
}

/**
 * Writes a modified configuration object to 'required-server-files.json'.
 * To get the full configuration, use the 'getRequiredServerFiles' method.
 */
export const updateRequiredServerFiles = async (publish: string, modifiedConfig: RequiredServerFiles) => {
  const configFile = join(publish, 'required-server-files.json')
  await writeJSON(configFile, modifiedConfig)
}

const resolveModuleRoot = (moduleName) => {
  try {
    return dirname(relative(process.cwd(), require.resolve(`${moduleName}/package.json`, { paths: [process.cwd()] })))
  } catch {
    return null
  }
}

const DEFAULT_EXCLUDED_MODULES = ['sharp', 'electron']

export const configureHandlerFunctions = async ({ netlifyConfig, publish, ignore = [] }) => {
  const config = await getRequiredServerFiles(publish)
  const files = config.files || []
  const cssFilesToInclude = files.filter((f) => f.startsWith(`${publish}/static/css/`))

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
      './public/locales/**',
      './next-i18next.config.js',
      `${publish}/server/**`,
      `${publish}/serverless/**`,
      `${publish}/*.json`,
      `${publish}/BUILD_ID`,
      `${publish}/static/chunks/webpack-middleware*.js`,
      `!${publish}/server/**/*.js.nft.json`,
      ...cssFilesToInclude,
      ...ignore.map((path) => `!${slash(path)}`),
    )

    const nextRoot = resolveModuleRoot('next')
    if (nextRoot) {
      netlifyConfig.functions[functionName].included_files.push(
        `!${nextRoot}/dist/server/lib/squoosh/**/*.wasm`,
        `!${nextRoot}/dist/next-server/server/lib/squoosh/**/*.wasm`,
        `!${nextRoot}/dist/compiled/webpack/bundle4.js`,
        `!${nextRoot}/dist/compiled/webpack/bundle5.js`,
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

interface BuildHeaderParams {
  path: string
  headers: Header['headers']
  locale?: string
}

const buildHeader = (buildHeaderParams: BuildHeaderParams) => {
  const { path, headers } = buildHeaderParams

  return {
    for: path,
    values: headers.reduce((builtHeaders, { key, value }) => {
      builtHeaders[key] = value

      return builtHeaders
    }, {}),
  }
}

// Replace the pattern :path* at the end of a path with * since it's a named splat which the Netlify
// configuration does not support.
const sanitizePath = (path: string) => path.replace(/:[^*/]+\*$/, '*')

/**
 * Persist NEXT.js custom headers to the Netlify configuration so the headers work with static files
 * See {@link https://nextjs.org/docs/api-reference/next.config.js/headers} for more information on custom
 * headers in Next.js
 *
 * @param nextConfig - The NextJS configuration
 * @param netlifyHeaders - Existing headers that are already configured in the Netlify configuration
 */
export const generateCustomHeaders = (nextConfig: NextConfig, netlifyHeaders: NetlifyHeaders = []) => {
  // The routesManifest is the contents of the routes-manifest.json file which will already contain the generated
  // header paths which take locales and base path into account since this runs after the build. The routes-manifest.json
  // file is located at demos/default/.next/routes-manifest.json once you've build the demo site.
  const {
    routesManifest: { headers: customHeaders = [] },
    i18n,
  } = nextConfig

  // Skip `has` based custom headers as they have more complex dynamic conditional header logic
  // that currently isn't supported by the Netlify configuration.
  // Also, this type of dynamic header logic is most likely not for SSG pages.
  for (const { source, headers, locale: localeEnabled } of customHeaders.filter((customHeader) => !customHeader.has)) {
    // Explicitly checking false to make the check simpler.
    // Locale specific paths are excluded only if localeEnabled is false. There is no true value for localeEnabled. It's either
    // false or undefined, where undefined means it's true.
    //
    // Again, the routesManifest has already been generated taking locales into account, but the check is required
    // so  the paths can be properly set in the Netlify configuration.
    const useLocale = i18n?.locales?.length > 0 && localeEnabled !== false

    if (useLocale) {
      const { locales } = i18n
      const joinedLocales = locales.join('|')

      /**
       *  converts e.g.
       *  /:nextInternalLocale(en|fr)/some-path
       *  to a path for each locale
       *  /en/some-path and /fr/some-path as well as /some-path (default locale)
       */
      const defaultLocalePath = sanitizePath(source).replace(`/:nextInternalLocale(${joinedLocales})`, '')

      netlifyHeaders.push(buildHeader({ path: defaultLocalePath, headers }))

      for (const locale of locales) {
        const path = sanitizePath(source).replace(`:nextInternalLocale(${joinedLocales})`, locale)

        netlifyHeaders.push(buildHeader({ path, headers }))
      }
    } else {
      const path = sanitizePath(source)

      netlifyHeaders.push(buildHeader({ path, headers }))
    }
  }
}
