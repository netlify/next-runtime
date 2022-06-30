![Essential Next.js Build Plugin](next-on-netlify.png)

# Essential Next.js Build Plugin

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

## Installing the plugin

The plugin installs automatically for new Next.js sites on Netlify. You can also install it manually like this:

```shell
npm install -D @netlify/plugin-nextjs
```

...then add the plugin to your `netlify.toml` file:

```toml
[[plugins]]
package = "@netlify/plugin-nextjs"
```

## Deploying

If you build on Netlify, this plugin will work with no additional configuration. However if you are building and
deploying locally using the Netlify CLI, you must deploy using `netlify deploy --build`. Running the build and deploy
commands separately will not work, because the plugin will not generate the required configuration.

## Using `next/image`

If you use [`next/image`](https://nextjs.org/docs/basic-features/image-optimization), your images will be automatically
optimized at runtime, ensuring that they are served at the best size and format. The image will be processed on the
first request which means it may take longer to load, but the generated image is then cached at the edge and served as a
static file to future visitors. By default, Next will deliver WebP images if the browser supports it. WebP is a new
image format with wide browser support that will usually generate smaller files than png or jpg. You can additionally
enable the AVIF format, which is often even smaller in filesize than WebP. The drawback is that with particularly large
images AVIF may take too long to generate, meaning the function times-out. You can configure
[the supported image formats](https://nextjs.org/docs/api-reference/next/image#acceptable-formats) in your
`next.config.js` file.

In order to deliver the correct format to a visitor's browser, this uses a Netlify Edge Function. In some cases your
site may not support Edge Functions, in which case it will instead fall back to delivering the original file format. You
may also manually disable the Edge Function by setting the environment variable `NEXT_DISABLE_EDGE_IMAGES` to `true`.

## Next.js Middleware on Netlify

Next.js Middleware works out of the box on Netlify, but check out the
[docs on some caveats](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/middleware.md). By default,
middleware runs using SSR. For better results, you should enable [Netlify Edge Functions](#netlify-edge-functions),
which ensures middleware runs at the edge. To use Netlify Edge Functions for middleware or to enable
[edge server rendering](https://nextjs.org/blog/next-12-2#edge-server-rendering-experimental), set the environment
variable `NEXT_USE_NETLIFY_EDGE` to `true`.

### No nested middleware in Next 12.2.0

In Next 12.2.0, nested middleware [has been deprecated](https://nextjs.org/docs/messages/middleware-upgrade-guide) in
favor of root level middleware. If you are not using edge functions then this means that you won't get the benefits of
using a CDN, and ISR will not work.

To fix this issue, you can run your middleware on [Netlify Edge Functions](#netlify-edge-functions) by setting the
environment variable `NEXT_USE_NETLIFY_EDGE` to `true`.

## Monorepos

If you are using a monorepo you will need to change `publish` to point to the full path to the built `.next` directory,
which may be in a subdirectory. If you have changed your `distDir` then it will need to match that.

If you are using Nx, then you will need to point `publish` to the folder inside `dist`, e.g. `dist/apps/myapp/.next`.

## Incremental Static Regeneration (ISR)

The Essential Next.js plugin now fully supports ISR on Netlify. For more details see
[the ISR docs](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/isr.md).

## Use with `next export`

If you are using `next export` to generate a static site, you do not need most of the functionality of this plugin and
you can remove it. Alternatively you can
[set the environment variable](https://docs.netlify.com/configure-builds/environment-variables/)
`NETLIFY_NEXT_PLUGIN_SKIP` to `true` and the plugin will handle caching but won't generate any functions for SSR
support. See [`demos/next-export`](https://github.com/netlify/netlify-plugin-nextjs/tree/main/demos/next-export) for an
example.

## Asset optimization

Netlify [asset optimization](https://docs.netlify.com/site-deploys/post-processing/) should not be used with Next.js
sites. Assets are already optimized by Next.js at build time, and doing further optimization can break your site. Ensure
that it is not enabled at **Site settings > Build & deploy > Post processing > Asset optimization**.

## Generated functions

This plugin works by generating three Netlify functions that handle requests that haven't been pre-rendered. These are
`___netlify-handler` (for SSR and API routes), `___netlify-odb-handler` (for ISR and fallback routes), and `_ipx` (for
images). You can see the requests for these in [the function logs](https://docs.netlify.com/functions/logs/). For ISR
and fallback routes you will not see any requests that are served from the edge cache, just actual rendering requests.
These are all internal functions, so you won't find them in your site's own functions directory.

The plugin will also generate a Netlify Edge Function called 'ipx' to handle image content negotiation, and if Edge
runtime or middleware is enabled it will also generate edge functions for middleware and edge routes.

## Migrating from an older version of the plugin

You can manually upgrade from the previous version of the plugin by running the following command:

```shell
npm install -D @netlify/plugin-nextjs@latest
```

Change the `publish` directory to `.next`:

```toml
[build]
publish = ".next"
```

If you previously set these values, they're no longer needed and can be removed:

- `distDir` in your `next.config.js`
- `node_bundler = "esbuild"` in `netlify.toml`
- `external_node_modules` in `netlify.toml`

The `serverless` and `experimental-serverless-trace` targets are deprecated in Next 12, and all builds with this plugin
will now use the default `server` target. If you previously set the target in your `next.config.js`, you should remove
it.

If you currently use redirects or rewrites on your site, see
[the Rewrites and Redirects guide](https://github.com/netlify/netlify-plugin-nextjs/blob/main/docs/redirects-rewrites.md)
for information on changes to how they are handled in this version. In particular, note that `_redirects` and `_headers`
files must be placed in `public`, not in the root of the site.

## Feedback

If you think you have found a bug in the plugin,
[please open an issue](https://github.com/netlify/netlify-plugin-nextjs/issues). If you have comments or feature
requests, [see the dicussion board](https://github.com/netlify/netlify-plugin-nextjs/discussions)
