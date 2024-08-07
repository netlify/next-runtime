import { cp, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

import { Manifest } from '@netlify/edge-functions'

import { IPX_HANDLER_NAME, type PluginContext } from '../plugin-context.js'

const sanitizeEdgePath = (imagesPath: string) =>
  new URL(imagesPath, process.env.URL || 'http://n').pathname as `/${string}`

const getAdjustedImageConfig = (ctx: PluginContext) => {
  return {
    ...ctx.buildConfig.images,
    basePath: [ctx.buildConfig.basePath, IPX_HANDLER_NAME].join('/'),
  }
}

export const createIpxHandler = async (ctx: PluginContext) => {
  await mkdir(ctx.ipxHandlerRootDir, { recursive: true })

  await cp(
    join(ctx.pluginDir, 'dist/build/templates/ipx.ts'),
    join(ctx.ipxHandlerRootDir, '_ipx.ts'),
  )

  await writeFile(
    join(ctx.ipxHandlerRootDir, 'imageconfig.json'),
    JSON.stringify(getAdjustedImageConfig(ctx)),
  )

  await writeFile(
    join(ctx.ipxHandlerRootDir, '_ipx.json'),
    JSON.stringify({
      version: 1,
      config: {
        name: 'next/image handler',
        generator: `${ctx.pluginName}@${ctx.pluginVersion}`,
        timeout: 120,
      },
    }),
  )

  ctx.netlifyConfig.redirects.push(
    {
      from: ctx.buildConfig.images.path,
      // eslint-disable-next-line id-length
      query: { url: ':url', w: ':width', q: ':quality' },
      to: `${ctx.buildConfig.basePath}/${IPX_HANDLER_NAME}/w_:width,q_:quality/:url`,
      status: 301,
    },
    {
      from: `${ctx.buildConfig.basePath}/${IPX_HANDLER_NAME}/*`,
      to: `/.netlify/builders/${IPX_HANDLER_NAME}`,
      status: 200,
    },
  )
}

export const createIpxEdgeAcceptHandler = async (ctx: PluginContext, netlifyManifest: Manifest) => {
  await mkdir(ctx.ipxEdgeHandlerRootDir, { recursive: true })
  await cp(
    join(ctx.pluginDir, 'dist/build/templates/ipx-edge-accept-handler.ts'),
    join(ctx.ipxEdgeHandlerRootDir, 'index.ts'),
  )
  await writeFile(
    join(ctx.ipxEdgeHandlerRootDir, 'imageconfig.json'),
    JSON.stringify(getAdjustedImageConfig(ctx)),
  )

  netlifyManifest.functions.push({
    function: IPX_HANDLER_NAME,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    name: 'next/image handler',
    path: ctx.buildConfig.images.path
      ? sanitizeEdgePath(ctx.buildConfig.images.path)
      : '/_next/image',
    generator: `${ctx.pluginName}@${ctx.pluginVersion}`,
  })

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  netlifyManifest.layers ??= []
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  netlifyManifest.layers.push({
    name: `https://ipx-edge-function-layer.netlify.app/mod.ts`,
    flag: 'ipx-edge-function-layer-url',
  })
}
