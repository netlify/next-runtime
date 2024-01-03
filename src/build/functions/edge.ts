import type { NetlifyPluginOptions } from '@netlify/build'
import type { EdgeFunctionDefinition as NextDefinition } from 'next/dist/build/webpack/plugins/middleware-plugin.js'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getMiddlewareManifest } from '../config.js'
import {
  EDGE_FUNCTIONS_DIR,
  EDGE_HANDLER_NAME,
  PLUGIN_DIR,
  PLUGIN_NAME,
  PLUGIN_VERSION,
} from '../constants.js'

interface NetlifyManifest {
  version: number
  functions: NetlifyDefinition[]
}

interface NetlifyDefinition {
  function: string
  name: string
  pattern: string
  cache?: 'manual'
  generator: string
}

const writeEdgeManifest = async (manifest: NetlifyManifest) => {
  await mkdir(resolve(EDGE_FUNCTIONS_DIR), { recursive: true })
  await writeFile(resolve(EDGE_FUNCTIONS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
}

const writeHandlerFile = async ({ name }: NextDefinition) => {
  const handlerName = getHandlerName({ name })

  await cp(
    join(PLUGIN_DIR, 'edge-runtime'),
    resolve(EDGE_FUNCTIONS_DIR, handlerName, 'edge-runtime'),
    { recursive: true },
  )
  await writeFile(
    resolve(EDGE_FUNCTIONS_DIR, handlerName, `${handlerName}.js`),
    `
    import {handleMiddleware} from './edge-runtime/middleware.ts';
    import handler from './server/${name}.js';
    export default (req, context) => handleMiddleware(req, context, handler);
    `,
  )
}

const copyHandlerDependencies = async ({ name, files }: NextDefinition) => {
  const edgeRuntimePath = join(PLUGIN_DIR, 'edge-runtime')
  const srcDir = resolve('.next/standalone/.next')
  const shimPath = resolve(edgeRuntimePath, 'shim/index.js')
  const shim = await readFile(shimPath, 'utf8')
  const imports = `import './edge-runtime-webpack.js';`
  const exports = `export default _ENTRIES["middleware_${name}"].default;`

  await Promise.all(
    files.map(async (file) => {
      const destDir = resolve(EDGE_FUNCTIONS_DIR, getHandlerName({ name }))

      if (file === `server/${name}.js`) {
        const entrypoint = await readFile(join(srcDir, file), 'utf8')
        const parts = [shim, imports, entrypoint, exports]

        await mkdir(dirname(join(destDir, file)), { recursive: true })
        await writeFile(join(destDir, file), parts.join('\n;'))

        return
      }

      await cp(join(srcDir, file), join(destDir, file))
    }),
  )
}

const createEdgeHandler = async (definition: NextDefinition): Promise<void> => {
  await copyHandlerDependencies(definition)
  await writeHandlerFile(definition)
}

const getHandlerName = ({ name }: Pick<NextDefinition, 'name'>): string =>
  `${EDGE_HANDLER_NAME}-${name.replace(/\W/g, '-')}`

const buildHandlerDefinition = ({ name, matchers, page }: NextDefinition): NetlifyDefinition => ({
  function: getHandlerName({ name }),
  name: name === 'middleware' ? 'Next.js Middleware Handler' : `Next.js Edge Handler: ${page}`,
  pattern: matchers[0].regexp,
  cache: name === 'middleware' ? undefined : 'manual',
  generator: `${PLUGIN_NAME}@${PLUGIN_VERSION}`,
})

export const createEdgeHandlers = async ({
  constants,
}: Pick<NetlifyPluginOptions, 'constants'>) => {
  await rm(EDGE_FUNCTIONS_DIR, { recursive: true, force: true })

  const nextManifest = await getMiddlewareManifest(constants)
  const nextDefinitions = [
    ...Object.values(nextManifest.middleware),
    // ...Object.values(nextManifest.functions)
  ]
  await Promise.all(nextDefinitions.map(createEdgeHandler))

  const netlifyDefinitions = nextDefinitions.map(buildHandlerDefinition)
  const netlifyManifest = {
    version: 1,
    functions: netlifyDefinitions,
  }
  await writeEdgeManifest(netlifyManifest)
}
