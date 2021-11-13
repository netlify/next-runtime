![Next.js on Netlify Build Plugin](next-on-netlify.png)

# Essential Next.js Build Plugin (beta)

:warning: This is the beta version of the Essential Next.js plugin. For the stable version, refer to
[Essential Next.js plugin v3](https://github.com/netlify/netlify-plugin-nextjs/tree/v3#readme) :warning:

<p align="center">
  <a aria-label="npm version" href="https://www.npmjs.com/package/@netlify/plugin-nextjs">
    <img alt="" src="https://img.shields.io/npm/v/@netlify/plugin-nextjs">
  </a>
  <a aria-label="MIT License" href="https://img.shields.io/npm/l/@netlify/plugin-nextjs">
    <img alt="" src="https://img.shields.io/npm/l/@netlify/plugin-nextjs">
  </a>
</p>

## What's new in this version

Version 4 is a complete rewrite of the Essential Next.js plugin. For full details of everything that's new, check out
[the v4 release notes](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/release-notes/v4.md)

## Installing the beta

- Install the module:

```shell
npm install -D @netlify/plugin-nextjs@beta
```

- Change the `publish` directory to `.next` and add the plugin to `netlify.toml` if not already installed:

```toml
[build]
publish = ".next"

[[plugins]]
package = "@netlify/plugin-nextjs"
```

If you previously set a custom `distDir` in your `next.config.js`, or set `node_bundler` or `external_node_modules` in
your `netlify.toml` these are no longer needed and can be removed.

The `serverless` and `experimental-serverless-trace` targets are deprecated in Next 12, and all builds with this plugin
will now use the default `server` target. If you previously set the target in your `next.config.js`, you should remove
it.

If you are using a monorepo you will need to change `publish` to point to the full path to the built `.next` directory,
which may be in a subdirectory. If you have changed your `distDir` then it will need to match that.

If you are using Nx, then you will need to point `publish` to the folder inside `dist`, e.g. `dist/apps/myapp/.next`.

If you currently use redirects or rewrites on your site, see
[the Rewrites and Redirects guide](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/redirects-rewrites.md)
for information on changes to how they are handled in this version.

If you want to use Next 12's beta Middleware feature, this will mostly work as expected but please
[read the docs on some caveats and workarounds](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/middleware.md)
that are currently needed.

## Beta feedback

Please share any thoughts, feedback or questions about the beta
[in our discussion](https://github.com/netlify/netlify-plugin-nextjs/discussions/706).
