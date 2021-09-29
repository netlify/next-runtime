# Essential Next.js (Experimental)

_Experimental plugin for Next.js applications on Netlify_

:warning: This plugin is an early alpha, for testing purposes only. It is not feature-complete and should not be used for production sites.

It does not support: i18n, basePath or preview mode, and monorepo support is limited. Do not report issues for sites that use these features.

## Installation

- Remove the existing Essential Next.js plugin (`@netlify/plugin-nextjs`). See the instructions to [uninstall the plugin](https://ntl.fyi/remove-plugin)
- Install the module:
```shell
npm install -D @netlify/plugin-nextjs-experimental
```
- Add to `netlify.toml`:
```toml
[[plugins]]
package = "@netlify/plugin-nextjs-experimental"
```

Unlike the existing plugin, this does not require `target` to be set to `serverless`, so you may remove that. It also does not currently support ESBuild, so if you had manually enabled it in your `netlify.toml`, you will need to remove that.

## Differences from the existing plugin
The main difference from the existing plugin is that it no longer generates a function for each route. Instead it generates one builder function for pages with `fallback="blocking"` or `fallback="true"`, and another function for all other routes. It then uses Next.js's own routing system rather than Netlify's. This means that it support's Next.js rewrites and redirects, and no longer needs to generate a `_redirects` file. You can add your own Netlify redirects to `netlify.toml` if needed, and these will be applied before any Next.js routing.