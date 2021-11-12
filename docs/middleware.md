# Using Next 12 middleware on Netlify

Next 12 introduces a new feature called [middleware](https://nextjs.org/docs/middleware), which are functions that are
run before a request has finished processing, and can be used to modify the request or replace the response. For
example, it can change headers, rewrite the request path, or return a different response entirely.

Next Middleware can run either in an edge function or at the origin. On Netlify, middleware runs at the origin as part
of the normal Next.js server.

## How to deploy Next 12 middleware

Next 12 Middleware works out of the box with Netlify, and most functions will work unchanged. See
[the middleware docs](https://nextjs.org/docs/middleware) for details of how to create them. There are however a few
workarounds that are currently required for some features during the beta period:

### `geo`

When running at the origin, Next does not populate the `request.geo` object. Fortunately there is a one line fix to get
the visitor's country:

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

## Caveats

Because the middleware runs at the origin, it is run _after_ Netlify rewrites and redirects. If a static file is served
then it is never run, as it is only run when a page is served by Next.js. This means that it should not be used with the
`EXPERIMENTAL_MOVE_STATIC_FILES` option, as this causes statically-generated pages to be served by the Netlify CDN
before any middleware can be run.

There is currently [a bug in Next.js](https://github.com/vercel/next.js/issues/31179) that causes a proxy loop if you
try to rewrite to a URL with a host other than localhost. If you are using a pattern like this:

```typescript
export function middleware(req: NextRequest) {
  // Change the `nextUrl` property in some way
  req.nextUrl = req.nextUrl.replace('something', 'somethingelse')
  // ...then rewrite to the changed URL
  return NextResponse.rewrite(req.nextUrl)
}
```

...then you need to set the `nextUrl.host` to `localhost`:

```typescript
export function middleware(req: NextRequest) {
  // Change the `nextUrl` property in some way
  req.nextUrl = req.nextUrl.replace('something', 'somethingelse')
  req.nextUrl.host = 'localhost'

  // ...then rewrite to the changed URL
  return NextResponse.rewrite(req.nextUrl)
}
```

If you have any issues with middleware on Netlify while it is beta, particularly if they cannot be reproduced when
running locally, then please add a comment to [the Next plugin beta discussion](https://ntl.fyi/next-beta-feedback)
