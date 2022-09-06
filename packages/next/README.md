![Next.js Runtime](https://github.com/netlify/next-runtime/raw/main/next-on-netlify.png)

<p align="center">
  <a aria-label="npm version" href="https://www.npmjs.com/package/@netlify/next">
    <img alt="" src="https://img.shields.io/npm/v/@netlify/next">
  </a>
  <a aria-label="MIT License" href="https://img.shields.io/npm/l/@netlify/next">
    <img alt="" src="https://img.shields.io/npm/l/@netlify/next">
  </a>
</p>

# `@netlify/next`

The `@netlify/next` package makes Next.js even better.

## Next.js Advanced Middleware

Regular Next.js Middleware doesn’t provide access to the actual response, or allow you to modify the request. The
`@netlify/next` library brings the power of Netlify Edge Functions to Next.js Middleware. It gives full access to the
request and response objects, allowing you to modify requests before they are sent to your Next.js app, and modify
responses before they are sent to the browser. This allows you to personalize pages on the fly, even if they are
statically-generated. It includes baked-in support for:

- HTML rewrites
- Page data transforms
- Modifying request headers
- Access to response body

For full details,
[see the docs](https://docs.netlify.com/integrations/frameworks/next-js/middleware/#next-js-advanced-middleware-with-the-netlify-next-library).
