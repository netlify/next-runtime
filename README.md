# Essential Next.js (Experimental)

_Experimental plugin for Next.js applications on Netlify_

:warning: This plugin is an alpha for testing purposes only. It is not yet stable and should not be used for production sites.

## Installing the alpha

- Remove the existing Essential Next.js plugin (`@netlify/plugin-nextjs`). See the instructions to [uninstall the plugin](https://ntl.fyi/remove-plugin)
- Install the module:
```shell
npm install -D @netlify/plugin-nextjs-experimental
```
- Change the `publish` directory to `.next`  and add the plugin to `netlify.toml`:
```toml
[build]
publish = ".next"

[[plugins]]
package = "@netlify/plugin-nextjs-experimental"
```
