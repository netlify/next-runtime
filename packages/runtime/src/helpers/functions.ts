import type { NetlifyConfig, NetlifyPluginConstants } from '@netlify/build'
import bridgeFile from '@vercel/node-bridge'
import { copyFile, ensureDir, writeFile, writeJSON } from 'fs-extra'
import type { ImageConfigComplete, RemotePattern } from 'next/dist/shared/lib/image-config'
import { join, relative, resolve } from 'pathe'

import { HANDLER_FUNCTION_NAME, ODB_FUNCTION_NAME, IMAGE_FUNCTION_NAME, DEFAULT_FUNCTIONS_SRC } from '../constants'
import { getHandler } from '../templates/getHandler'
import { getPageResolver } from '../templates/getPageResolver'

export const generateFunctions = async (
  { FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC, INTERNAL_FUNCTIONS_SRC, PUBLISH_DIR }: NetlifyPluginConstants,
  appDir: string,
): Promise<void> => {
  const functionsDir = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC
  const functionDir = join(process.cwd(), functionsDir, HANDLER_FUNCTION_NAME)
  const publishDir = relative(functionDir, resolve(PUBLISH_DIR))

  const writeHandler = async (func: string, isODB: boolean) => {
    const handlerSource = await getHandler({ isODB, publishDir, appDir: relative(functionDir, appDir) })
    await ensureDir(join(functionsDir, func))
    await writeFile(join(functionsDir, func, `${func}.js`), handlerSource)
    await copyFile(bridgeFile, join(functionsDir, func, 'bridge.js'))
    await copyFile(
      join(__dirname, '..', '..', 'lib', 'templates', 'handlerUtils.js'),
      join(functionsDir, func, 'handlerUtils.js'),
    )
  }

  await writeHandler(HANDLER_FUNCTION_NAME, false)
  await writeHandler(ODB_FUNCTION_NAME, true)
}

/**
 * Writes a file in each function directory that contains references to every page entrypoint.
 * This is just so that the nft bundler knows about them. We'll eventually do this better.
 */
export const generatePagesResolver = async ({
  constants: { INTERNAL_FUNCTIONS_SRC, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC, PUBLISH_DIR },
  target,
}: {
  constants: NetlifyPluginConstants
  target: string
}): Promise<void> => {
  const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC

  const jsSource = await getPageResolver({
    publish: PUBLISH_DIR,
    target,
  })

  await writeFile(join(functionsPath, ODB_FUNCTION_NAME, 'pages.js'), jsSource)
  await writeFile(join(functionsPath, HANDLER_FUNCTION_NAME, 'pages.js'), jsSource)
}

// Move our next/image function into the correct functions directory
export const setupImageFunction = async ({
  constants: { INTERNAL_FUNCTIONS_SRC, FUNCTIONS_SRC = DEFAULT_FUNCTIONS_SRC },
  imageconfig = {},
  netlifyConfig,
  basePath,
  remotePatterns,
}: {
  constants: NetlifyPluginConstants
  netlifyConfig: NetlifyConfig
  basePath: string
  imageconfig: Partial<ImageConfigComplete>
  remotePatterns: RemotePattern[]
}): Promise<void> => {
  const functionsPath = INTERNAL_FUNCTIONS_SRC || FUNCTIONS_SRC
  const functionName = `${IMAGE_FUNCTION_NAME}.js`
  const functionDirectory = join(functionsPath, IMAGE_FUNCTION_NAME)

  await ensureDir(functionDirectory)
  await writeJSON(join(functionDirectory, 'imageconfig.json'), {
    ...imageconfig,
    basePath: [basePath, IMAGE_FUNCTION_NAME].join('/'),
    remotePatterns,
  })
  await copyFile(join(__dirname, '..', '..', 'lib', 'templates', 'ipx.js'), join(functionDirectory, functionName))

  const imagePath = imageconfig.path || '/_next/image'

  // If we have edge functions then the request will have already been rewritten
  // so this won't match. This is matched if edge is disabled or unavailable.
  netlifyConfig.redirects.push({
    from: `${imagePath}*`,
    query: { url: ':url', w: ':width', q: ':quality' },
    to: `${basePath}/${IMAGE_FUNCTION_NAME}/w_:width,q_:quality/:url`,
    status: 301,
  })

  netlifyConfig.redirects.push({
    from: `${basePath}/${IMAGE_FUNCTION_NAME}/*`,
    to: `/.netlify/builders/${IMAGE_FUNCTION_NAME}`,
    status: 200,
  })

  if (basePath) {
    // next/image generates image static URLs that still point at the site root
    netlifyConfig.redirects.push({
      from: '/_next/static/image/*',
      to: '/static/image/:splat',
      status: 200,
    })
  }
}
