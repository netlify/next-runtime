/* eslint-disable n/no-extraneous-require, no-underscore-dangle, @typescript-eslint/no-explicit-any */

// This is a modified version of the require hooks from Next.js
// https://github.com/vercel/next.js/blob/b04c70573ac199a9bb3ea42201e0865e610d5b67/packages/next/src/server/require-hook.ts

import mod from 'module'

import type { NextConfig } from '../helpers/config'

const resolveFilename = (mod as any)._resolveFilename
const requireHooks = new Map<string, Map<string, string>>()

export const overrideRequireHooks = (config: NextConfig) => {
  // we may have changed the working directory in the handler
  const opts = {
    paths: [process.cwd()],
  }

  requireHooks.set(
    'default',
    new Map([
      ['react', require.resolve(`react`, opts)],
      ['react/jsx-runtime', require.resolve(`react/jsx-runtime`, opts)],
    ]),
  )

  if (config.experimental.appDir) {
    requireHooks.set(
      'next',
      new Map([
        ['react', require.resolve(`next/dist/compiled/react`, opts)],
        ['react/jsx-runtime', require.resolve(`next/dist/compiled/react/jsx-runtime`, opts)],
        ['react/jsx-dev-runtime', require.resolve(`next/dist/compiled/react/jsx-dev-runtime`, opts)],
        ['react-dom', require.resolve(`next/dist/compiled/react-dom/server-rendering-stub`, opts)],
        ['react-dom/client', require.resolve(`next/dist/compiled/react-dom/client`, opts)],
        ['react-dom/server', require.resolve(`next/dist/compiled/react-dom/server`, opts)],
        ['react-dom/server.browser', require.resolve(`next/dist/compiled/react-dom/server.browser`, opts)],
        ['react-dom/server.edge', require.resolve(`next/dist/compiled/react-dom/server.edge`, opts)],
        [
          'react-server-dom-webpack/client',
          require.resolve(`next/dist/compiled/react-server-dom-webpack/client`, opts),
        ],
        [
          'react-server-dom-webpack/client.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack/client.edge`, opts),
        ],
        [
          'react-server-dom-webpack/server.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack/server.edge`, opts),
        ],
        [
          'react-server-dom-webpack/server.node',
          require.resolve(`next/dist/compiled/react-server-dom-webpack/server.node`, opts),
        ],
        ['styled-jsx', require.resolve('styled-jsx', opts)],
        ['styled-jsx/style', require.resolve('styled-jsx/style', opts)],
      ]),
    )
  }

  if (config.experimental.serverActions) {
    requireHooks.set(
      'experimental',
      new Map([
        ['react', require.resolve(`next/dist/compiled/react-experimental`, opts)],
        ['react/jsx-runtime', require.resolve(`next/dist/compiled/react-experimental/jsx-runtime`, opts)],
        ['react/jsx-dev-runtime', require.resolve(`next/dist/compiled/react-experimental/jsx-dev-runtime`, opts)],
        ['react-dom', require.resolve(`next/dist/compiled/react-dom-experimental/server-rendering-stub`, opts)],
        ['react-dom/client', require.resolve(`next/dist/compiled/react-dom-experimental/client`, opts)],
        ['react-dom/server', require.resolve(`next/dist/compiled/react-dom-experimental/server`, opts)],
        ['react-dom/server.browser', require.resolve(`next/dist/compiled/react-dom-experimental/server.browser`, opts)],
        ['react-dom/server.edge', require.resolve(`next/dist/compiled/react-dom-experimental/server.edge`, opts)],
        [
          'react-server-dom-webpack/client',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/client`, opts),
        ],
        [
          'react-server-dom-webpack/client.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/client.edge`, opts),
        ],
        [
          'react-server-dom-webpack/server.edge',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/server.edge`, opts),
        ],
        [
          'react-server-dom-webpack/server.node',
          require.resolve(`next/dist/compiled/react-server-dom-webpack-experimental/server.node`, opts),
        ],
        ['styled-jsx', require.resolve('styled-jsx', opts)],
        ['styled-jsx/style', require.resolve('styled-jsx/style', opts)],
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
