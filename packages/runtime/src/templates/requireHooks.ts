/* eslint-disable n/no-extraneous-require, no-underscore-dangle, @typescript-eslint/no-explicit-any */
import mod from 'module'

import type { NextConfig } from '../helpers/config'

const resolveFilename = (mod as any)._resolveFilename
const requireHooks = new Map<string, Map<string, string>>()

export const overrideRequireHooks = (config: NextConfig) => {
  requireHooks.set(
    'default',
    new Map([
      ['react', require.resolve(`react`)],
      ['react/jsx-runtime', require.resolve(`react/jsx-runtime`)],
    ]),
  )

  if (config.experimental.appDir) {
    requireHooks.set(
      'next',
      new Map([
        ['react', require.resolve(`next/dist/compiled/react`)],
        ['react/jsx-runtime', require.resolve(`next/dist/compiled/react/jsx-runtime`)],
        ['react/jsx-dev-runtime', require.resolve(`next/dist/compiled/react/jsx-dev-runtime`)],
        ['react-dom', require.resolve(`next/dist/compiled/react-dom/server-rendering-stub`)],
        ['react-dom/client', require.resolve(`next/dist/compiled/react-dom/client`)],
        ['react-dom/server', require.resolve(`next/dist/compiled/react-dom/server`)],
        ['react-dom/server.browser', require.resolve(`next/dist/compiled/react-dom/server.browser`)],
        ['react-dom/server.edge', require.resolve(`next/dist/compiled/react-dom/server.edge`)],
        ['react-server-dom-webpack/client', require.resolve(`next/dist/compiled/react-server-dom-webpack/client`)],
        [
          'react-server-dom-webpack/client.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack/client.edge`),
        ],
        [
          'react-server-dom-webpack/server.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack/server.edge`),
        ],
        [
          'react-server-dom-webpack/server.node',
          require.resolve(`next/dist/compiled/react-server-dom-webpack/server.node`),
        ],
        ['styled-jsx', require.resolve('styled-jsx')],
        ['styled-jsx/style', require.resolve('styled-jsx/style')],
      ]),
    )
  }

  if (config.experimental.serverActions) {
    requireHooks.set(
      'experimental',
      new Map([
        ['react', require.resolve(`next/dist/compiled/react-experimental`)],
        ['react/jsx-runtime', require.resolve(`next/dist/compiled/react-experimental/jsx-runtime`)],
        ['react/jsx-dev-runtime', require.resolve(`next/dist/compiled/react-experimental/jsx-dev-runtime`)],
        ['react-dom', require.resolve(`next/dist/compiled/react-dom-experimental/server-rendering-stub`)],
        ['react-dom/client', require.resolve(`next/dist/compiled/react-dom-experimental/client`)],
        ['react-dom/server', require.resolve(`next/dist/compiled/react-dom-experimental/server`)],
        ['react-dom/server.browser', require.resolve(`next/dist/compiled/react-dom-experimental/server.browser`)],
        ['react-dom/server.edge', require.resolve(`next/dist/compiled/react-dom-experimental/server.edge`)],
        [
          'react-server-dom-webpack/client',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/client`),
        ],
        [
          'react-server-dom-webpack/client.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/client.edge`),
        ],
        [
          'react-server-dom-webpack/server.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/server.edge`),
        ],
        [
          'react-server-dom-webpack/server.node',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/server.node`),
        ],
        ['styled-jsx', require.resolve('styled-jsx')],
        ['styled-jsx/style', require.resolve('styled-jsx/style')],
      ]),
    )
  }
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
    const reactMode = process.env.__NEXT_PRIVATE_PREBUNDLED_REACT ?? 'default'
    const resolvedRequest = hooks.get(reactMode)?.get(request) ?? request

    return originalResolveFilename.call(mod, resolvedRequest, parent, isMain, options)

    // We use `bind` here to avoid referencing outside variables to create potential memory leaks.
  }.bind(null, resolveFilename, requireHooks)
}
/* eslint-enable n/no-extraneous-require, no-underscore-dangle, @typescript-eslint/no-explicit-any */
