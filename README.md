![Next.js Runtime](next-js-runtime.png)

# Next.js Runtime

Next.js is supported natively on Netlify, and in most cases you will not need to install or configure anything. This
repo includes the packages used to support Next.js on Netlify.

## Deploying

If you build on Netlify, the Next.js Runtime will work with no additional configuration. However if you are building and
deploying locally using the Netlify CLI, you must deploy using `netlify deploy --build`. Running the build and deploy
commands separately will not work, because the Next.js Runtime will not generate the required configuration.

## Using `next/image`

If you use [`next/image`](https://nextjs.org/docs/basic-features/image-optimization), your images will be automatically
optimized at runtime, ensuring that they are served at the best size and format. The image will be processed on the
first request which means it may take longer to load, but the generated image is then cached at the edge and served as a
static file to future visitors. By default, Next.js will deliver WebP images if the browser supports it. WebP is a new
image format with wide browser support that will usually generate smaller files than png or jpg. You can additionally
enable the AVIF format, which is often even smaller in filesize than WebP. The drawback is that with particularly large
images AVIF may take too long to generate, meaning the function times-out. You can configure
[the supported image formats](https://nextjs.org/docs/api-reference/next/image#acceptable-formats) in your
`next.config.js` file.

In order to deliver the correct format to a visitor's browser, this uses a Netlify Edge Function. In some cases your
site may not support Edge Functions, in which case it will instead fall back to delivering the original file format. You
may also manually disable the Edge Function by setting the environment variable `NEXT_DISABLE_EDGE_IMAGES` to `true`.

## Returning custom response headers on images handled by `ipx`

Should you wish to return custom response headers on images handled by the
[`netlify-ipx`](https://github.com/netlify/netlify-ipx) package, you can add them within your project's `netlify.toml`
by targeting the `/_next/image/*` route:

```
[[headers]]
  for = "/_next/image/*"

  [headers.values]
    Strict-Transport-Security = "max-age=31536000"
    X-Test = 'foobar'
```

## Disabling `ipx`

If you wish to disable the use of the `ipx` package, set the `DISABLE_IPX` environment variable to `true`. Please note that some requests to `/_next/image/*` may fail unless an image loader, such as Cloudinary or Imgix, is specified as a replacement for `ipx`. 

See the [Next.js documentation](https://nextjs.org/docs/api-reference/next/image#built-in-loaders) for options.

## Next.js Middleware on Netlify

Next.js Middleware works out of the box on Netlify. By default, middleware runs using Netlify Edge Functions. For legacy
support for running Middleware at the origin, set the environment variable `NEXT_DISABLE_NETLIFY_EDGE` to `true`. Be
aware that this will result in slower performance, as all pages that match middleware must use SSR.

For more details on Next.js Middleware with Netlify, see the [middleware docs](https://github.com/netlify/next-runtime/blob/main/docs/middleware.md).

### Limitations

Due to how the site configuration is handled when it's run using Netlify Edge Functions, data such as `locale` and `defaultLocale` will be missing on the `req.nextUrl` object when running `netlify dev`. 

However, this data is available on `req.nextUrl` in a production environment.

## Monorepos

If you are using a monorepo you will need to change `publish` to point to the full path to the built `.next` directory,
which may be in a subdirectory. If you have changed your `distDir` then it will need to match that.

If you are using Nx, then you will need to point `publish` to the folder inside `dist`, e.g. `dist/apps/myapp/.next`.

## Incremental Static Regeneration (ISR)

The Next.js Runtime fully supports ISR on Netlify. For more details see
[the ISR docs](https://github.com/netlify/next-runtime/blob/main/docs/isr.md).

Note that Netlify has a minimum TTL of 60 seconds for revalidation.

## Use with `next export`

If you are using `next export` to generate a static site, you do not need most of the functionality of this Next.js
Runtime and you can remove it. Alternatively you can
[set the environment variable](https://docs.netlify.com/configure-builds/environment-variables/)
`NETLIFY_NEXT_PLUGIN_SKIP` to `true` and the Next.js Runtime will handle caching but won't generate any functions for
SSR support. See [`demos/next-export`](https://github.com/netlify/next-runtime/tree/main/demos/next-export) for an
example.

## Asset optimization

Netlify [asset optimization](https://docs.netlify.com/site-deploys/post-processing/) should not be used with Next.js
sites. Assets are already optimized by Next.js at build time, and doing further optimization can break your site. Ensure
that it is not enabled at **Site settings > Build & deploy > Post processing > Asset optimization**.

## Generated functions

The Next.js Runtime works by generating three Netlify functions that handle requests that haven't been pre-rendered.
These are `___netlify-handler` (for SSR and API routes), `___netlify-odb-handler` (for ISR and fallback routes), and
`_ipx` (for images). You can see the requests for these in
[the function logs](https://docs.netlify.com/functions/logs/). For ISR and fallback routes you will not see any requests
that are served from the edge cache, just actual rendering requests. These are all internal functions, so you won't find
them in your site's own functions directory.

The Next.js Runtime will also generate a Netlify Edge Function called 'ipx' to handle image content negotiation, and if
Edge runtime or middleware is enabled it will also generate edge functions for middleware and edge routes.

## Manually installing the Next.js Runtime

The Next.js Runtime installs automatically for new Next.js sites on Netlify. You can also install it manually like this:

```shell
npm install -D @netlify/plugin-nextjs
```

...then add the following to your `netlify.toml` file:

```toml
[[plugins]]
package = "@netlify/plugin-nextjs"
```

## Manually upgrading from an older version of the Next.js Runtime

If you previously set these values, they're no longer needed and should be removed:

- `distDir` in your `next.config.js`
- `node_bundler = "esbuild"` in `netlify.toml`
- `external_node_modules` in `netlify.toml`
- The environment variable `NEXT_USE_NETLIFY_EDGE` can be removed as this is now the default

The `serverless` and `experimental-serverless-trace` targets are deprecated in Next.js 12, and all builds with this Next.js
Runtime will now use the default `server` target. If you previously set the target in your `next.config.js`, you should
remove it.

If you currently use redirects or rewrites on your site, see
[the Rewrites and Redirects guide](https://github.com/netlify/next-runtime/blob/main/docs/redirects-rewrites.md) for
information on changes to how they are handled in this version. In particular, note that `_redirects` and `_headers`
files must be placed in `public`, not in the root of the site.

## Feedback

If you think you have found a bug in Next.js on Netlify,
[please open an issue](https://github.com/netlify/next-runtime/issues). If you have comments or feature requests,
[see the discussion board](https://github.com/netlify/next-runtime/discussions)
