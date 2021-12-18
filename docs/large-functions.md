## Troubleshooting large functions

You may see an error about generated functions being too large. This is because when deploying your site it is packaged
into a zipfile, which is limited by AWS to 50MB in size. There are two possible causes for this, each with its own
solution. The list of largest files shown in the build logs will help you see what the cause is.

- **Large dependencies** This is the most common cause of the problem. Some node modules are very large, mostly those
  that include native modules. Examples include `electron` and `chromium`. The function bundler is usually able to find
  out which modules are actually used by your code, but sometimes it will incorrectly include unneeded modules. If this
  is the case, you can either remove the module from your dependencies if you installed it yourself, or exclude it
  manually by adding something like this to your `netlify.toml`, changing the value according to the problematic module.
  The `!` at the beginning of the module path indicates that it should be excluded:

  ```toml
  [functions]
  included_files = ["!node_modules/a-large-module/**/*"]
  ```

  If you do need large modules at runtime (e.g. if you are running Puppeteer in a Next API route), consider changing to
  a Netlify function which will have less overhead than the equivalent Next.js function.
