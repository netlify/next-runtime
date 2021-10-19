![Next.js on Netlify Build Plugin](next-on-netlify.png)

# Essential Next.js Build Plugin (beta)


:warning: This is the beta version of the Essential Next.js plugin. For the stable version, see [Essential Next.js plugin v3](https://github.com/netlify/netlify-plugin-nextjs/tree/v3#readme) :warning:

<p align="center">
  <a aria-label="npm version" href="https://www.npmjs.com/package/@netlify/plugin-nextjs">
    <img alt="" src="https://img.shields.io/npm/v/@netlify/plugin-nextjs">
  </a>
  <a aria-label="MIT License" href="https://img.shields.io/npm/l/@netlify/plugin-nextjs">
    <img alt="" src="https://img.shields.io/npm/l/@netlify/plugin-nextjs">
  </a>
</p>


## Installing the beta


- Install the module:
```shell
npm install -D @netlify/plugin-nextjs@beta
```
- Change the `publish` directory to `.next`  and add the plugin to `netlify.toml` if not already installed:
```toml
[build]
publish = ".next"

[[plugins]]
package = "@netlify/plugin-nextjs"
```

If you previously set `target: "serverless"`, `node_bundler` or `external_node_modules` in your `next.config.js` these are longer needed and can be removed.

## Beta feedback

Please share any thoughts, feedback or questions about the beta [in our discussion](https://github.com/netlify/netlify-plugin-nextjs/discussions/706).
