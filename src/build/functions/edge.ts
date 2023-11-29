import type { EdgeFunctionDefinition as NextDefinition } from 'next/dist/build/webpack/plugins/middleware-plugin.js'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { getMiddlewareManifest } from '../config.js'
import {
  EDGE_FUNCTIONS_DIR,
  EDGE_HANDLER_NAME,
  PLUGIN_DIR,
  PLUGIN_NAME,
  PLUGIN_VERSION,
} from '../constants.js'

interface NetlifyManifest {
  version: 1
  functions: NetlifyDefinition[]
}

type NetlifyDefinition =
  | {
      function: string
      name?: string
      path: string
      cache?: 'manual'
      generator: string
    }
  | {
      function: string
      name?: string
      pattern: string
      cache?: 'manual'
      generator: string
    }

const getHandlerName = ({ name }: NextDefinition) =>
  EDGE_HANDLER_NAME.replace('{{name}}', name.replace(/\W/g, '-'))

const buildHandlerDefinitions = (
  { name: definitionName, matchers, page }: NextDefinition,
  handlerName: string,
): NetlifyDefinition[] => {
  return definitionName === 'middleware'
    ? [
        {
          function: handlerName,
          name: 'Next.js Middleware Handler',
          path: '/*',
          generator: `${PLUGIN_NAME}@${PLUGIN_VERSION}`,
        } as any,
      ]
    : matchers.map((matcher) => ({
        function: handlerName,
        name: `Next.js Edge Handler: ${page}`,
        pattern: matcher.regexp,
        cache: 'manual',
        generator: `${PLUGIN_NAME}@${PLUGIN_VERSION}`,
      }))
}

const copyHandlerDependencies = async (
  { name: definitionName, files }: NextDefinition,
  handlerName: string,
) => {
  await Promise.all(
    files.map(async (file) => {
      const srcDir = join(process.cwd(), '.next/standalone/.next')
      const destDir = join(process.cwd(), EDGE_FUNCTIONS_DIR, handlerName)

      if (file === `server/${definitionName}.js`) {
        const entrypoint = await readFile(join(srcDir, file), 'utf8')
        // const exports = ``
        const exports = `
        export default _ENTRIES["middleware_${definitionName}"].default;
        // export default () => {

        // console.log('here', _ENTRIES)
        // }
        `
        await mkdir(dirname(join(destDir, file)), { recursive: true })
        await writeFile(
          join(destDir, file),
          `
          import './edge-runtime-webpack.js';


          var _ENTRIES = {};\n`.concat(entrypoint, '\n', exports),
        )
        return
      }

      await cp(join(srcDir, file), join(destDir, file))
    }),
  )
}

const writeHandlerFile = async ({ name: definitionName }: NextDefinition, handlerName: string) => {
  const handlerFile = resolve(EDGE_FUNCTIONS_DIR, handlerName, `${handlerName}.js`)
  const rel = relative(handlerFile, join(PLUGIN_DIR, 'dist/run/handlers/middleware.js'))
  await cp(
    join(PLUGIN_DIR, 'edge-runtime'),
    resolve(EDGE_FUNCTIONS_DIR, handlerName, 'edge-runtime'),
    {
      recursive: true,
    },
  )
  await writeFile(
    resolve(EDGE_FUNCTIONS_DIR, handlerName, `${handlerName}.js`),
    `import {handleMiddleware} from './edge-runtime/middleware.ts';
    import handler from './server/${definitionName}.js';
    export default (req, context) => handleMiddleware(req, context, handler);
    export const config = {path: "/*"}`,
  )
}

const writeEdgeManifest = async (manifest: NetlifyManifest) => {
  await mkdir(resolve(EDGE_FUNCTIONS_DIR), { recursive: true })
  await writeFile(resolve(EDGE_FUNCTIONS_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
}

export const createEdgeHandlers = async () => {
  await rm(EDGE_FUNCTIONS_DIR, { recursive: true, force: true })

  const nextManifest = await getMiddlewareManifest()
  const nextDefinitions = [
    ...Object.values(nextManifest.middleware),
    // ...Object.values(nextManifest.functions)
  ]
  const netlifyManifest: NetlifyManifest = {
    version: 1,
    functions: await nextDefinitions.reduce(
      async (netlifyDefinitions: Promise<NetlifyDefinition[]>, nextDefinition: NextDefinition) => {
        const handlerName = getHandlerName(nextDefinition)
        await copyHandlerDependencies(nextDefinition, handlerName)
        await writeHandlerFile(nextDefinition, handlerName)
        return [
          ...(await netlifyDefinitions),
          ...buildHandlerDefinitions(nextDefinition, handlerName),
        ]
      },
      Promise.resolve([]),
    ),
  }

  await writeEdgeManifest(netlifyManifest)
}
