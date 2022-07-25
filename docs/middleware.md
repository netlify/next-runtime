# Using Next 12 middleware on Netlify

Next 12 introduces a new feature called [Middleware](https://nextjs.org/docs/middleware), in which functions run before
a request has finished processing. Middleware can be used to modify the request or replace the response. For example, it
can change headers, rewrite the request path, or return a different response entirely.

Next.js Middleware can run either in an edge function (highly recommended for version 12.2+ as ISR will not work otherwise) or at the origin. On Netlify, middleware runs at the origin as
part of the normal Next.js server.

If you'd like to run Middleware at the edge, set the environment variable `NEXT_USE_NETLIFY_EDGE` to `true`.

## How to deploy Next 12 middleware

Next 12 Middleware works out of the box with Netlify, and most functions will work unchanged. See
[the middleware docs](https://nextjs.org/docs/middleware) for details of how to create them. There are however a few
workarounds that are currently required for some features during the beta period:

### `geo`

When running at the origin, Next.js does not populate the `request.geo` object as part of the [NextRequest](https://nextjs.org/docs/api-reference/next/server#nextrequest). Fortunately there is a one line fix to get the visitor's country:

```typescript
export async function middleware(req: NextRequest) {
  // Add this line
  req.geo.country = req.headers.get('x-country')

  // The rest of your middleware goes here
}
```

### `ip`

Next.js also does not populate the `req.ip` value when running at the origin. There is another one line fix for this:

```typescript
export async function middleware(req: NextRequest) {
  // Add this line
  req.ip = req.headers.get('x-nf-client-connection-ip')

  // The rest of your middleware goes here
}
```

## Caveats when middleware is run at the origin

When the middleware runs at the origin, it is run _after_ Netlify rewrites and redirects. If a static file is served
by the Netlify CDN then the middleware is never run, as middleware only runs when a page is served by Next.js. This
means that any pages that match middleware routes are served from the origin rather than the CDN.

There is a bug in Next.js `<=12.0.3` that causes a proxy loop if you try to rewrite to a URL with a host other than
localhost. This bug is fixed in version `12.0.4`, so if you are using middleware you should upgrade to that version or
later.

If you have an issue with Next.js middleware on Netlify while it is beta, particularly if the issue cannot be reproduced
when running locally, then please add a comment to
[the Next plugin beta discussion](https://ntl.fyi/next-beta-feedback).
