# Next.js Runtime

Next.js is supported natively on Netlify, and in most cases you will not need to install or
configure anything. This repo includes the packages used to support Next.js on Netlify.

## Testing

### Integration testing

How to add new integration test scenarios to the application:

1. Create a new folder under `tests/fixtures/<your-name>`
2. Adapt the `next.config.js` to be a standalone application
3. Create a `postinstall` script that runs the `next build`. It's important to notice that the
   integration tests rely on a already built next.js application in this folder. They rely on the
   `.next` folder.
4. Add your test

> Currently the tests require a built version of the `dist/run/handlers/cache.cjs` so you need to
> run `npm run build` before executing the integration tests.
