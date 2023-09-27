/* eslint-disable no-underscore-dangle, @typescript-eslint/no-explicit-any */

// This is a modified version of the require hooks from Next.js
// https://github.com/vercel/next.js/blob/b04c70573ac199a9bb3ea42201e0865e610d5b67/packages/next/src/server/require-hook.ts

import mod from 'module'

import type { NextConfig } from '../helpers/config'

const resolveFilename = (mod as any)._resolveFilename
const requireHooks = new Map<string, Map<string, string>>()

export const overrideRequireHooks = (config: NextConfig) => {
  setRequireHooks(config)
  resolveRequireHooks()
}

const setRequireHooks = (config: NextConfig) => {
  requireHooks.set(
    'default',
    new Map([
      ['react', `react`],
      ['react/jsx-runtime', `react/jsx-runtime`],
    ]),
  )

  if (config.experimental.serverActions) {
    requireHooks.set(
      'experimental',
      new Map([
        ['react', `next/dist/compiled/react-experimental`],
        ['react/jsx-runtime', `next/dist/compiled/react-experimental/jsx-runtime`],
        ['react/jsx-dev-runtime', `next/dist/compiled/react-experimental/jsx-dev-runtime`],
        ['react-dom', `next/dist/compiled/react-dom-experimental/server-rendering-stub`],
        ['react-dom/client', `next/dist/compiled/react-dom-experimental/client`],
        ['react-dom/server', `next/dist/compiled/react-dom-experimental/server`],
        ['react-dom/server.browser', `next/dist/compiled/react-dom-experimental/server.browser`],
        ['react-dom/server.edge', `next/dist/compiled/react-dom-experimental/server.edge`],
        ['react-server-dom-webpack/client', `next/dist/compiled/react-server-dom-webpack-experimental/client`],
        [
          'react-server-dom-webpack/client.edge',
          `next/dist/compiled/react-server-dom-webpack-experimental/client.edge`,
        ],
        [
          'react-server-dom-webpack/server.edge',
          `next/dist/compiled/react-server-dom-webpack-experimental/server.edge`,
        ],
        [
          'react-server-dom-webpack/server.node',
          `next/dist/compiled/react-server-dom-webpack-experimental/server.node`,
        ],
        ['styled-jsx', 'styled-jsx'],
        ['styled-jsx/style', 'styled-jsx/style'],
      ]),
    )
  } else {
    requireHooks.set(
      'next',
      new Map([
        ['react', `next/dist/compiled/react`],
        ['react/jsx-runtime', `next/dist/compiled/react/jsx-runtime`],
        ['react/jsx-dev-runtime', `next/dist/compiled/react/jsx-dev-runtime`],
        ['react-dom', `next/dist/compiled/react-dom/server-rendering-stub`],
        ['react-dom/client', `next/dist/compiled/react-dom/client`],
        ['react-dom/server', `next/dist/compiled/react-dom/server`],
        ['react-dom/server.browser', `next/dist/compiled/react-dom/server.browser`],
        ['react-dom/server.edge', `next/dist/compiled/react-dom/server.edge`],
        ['react-server-dom-webpack/client', `next/dist/compiled/react-server-dom-webpack/client`],
        ['react-server-dom-webpack/client.edge', `next/dist/compiled/react-server-dom-webpack/client.edge`],
        ['react-server-dom-webpack/server.edge', `next/dist/compiled/react-server-dom-webpack/server.edge`],
        ['react-server-dom-webpack/server.node', `next/dist/compiled/react-server-dom-webpack/server.node`],
        ['styled-jsx', 'styled-jsx'],
        ['styled-jsx/style', 'styled-jsx/style'],
      ]),
    )
  }
}

const resolveRequireHooks = () => {
  // we may have changed the working directory in the handler
  const opts = { paths: [process.cwd()] }

  // resolve require hooks with module paths
  requireHooks.forEach((mode) => {
    mode.forEach((path, hook) => {
      try {
        const resolvedPath = require.resolve(path, opts)
        mode.set(hook, resolvedPath)
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          // module not present (older version of Next.js)
          mode.delete(hook)
        } else {
          throw error
        }
      }
    })
  })
}

export const applyRequireHooks = () => {
  // eslint-disable-next-line max-params, func-names
  ;(mod as any)._resolveFilename = function (
    originalResolveFilename: typeof resolveFilename,
    hooks: Map<string, Map<string, string>>,
    request: string,
    parent: any,
    isMain: boolean,
    options: any,
  ) {
    const reactMode = process.env.__NEXT_PRIVATE_PREBUNDLED_REACT || 'default'
    const resolvedRequest = hooks.get(reactMode)?.get(request) ?? request
    return originalResolveFilename.call(mod, resolvedRequest, parent, isMain, options)

    // We use `bind` here to avoid referencing outside variables to create potential memory leaks.
  }.bind(null, resolveFilename, requireHooks)
}
/* eslint-enable no-underscore-dangle, @typescript-eslint/no-explicit-any */
