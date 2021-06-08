## Caveats

### Versions

You can check the Essential Next.js plugin's `package.json` for supported Node versions.

For breaking Next.js releases, all Next.js versions before the breaking release will be locked to the last working plugin version:

Next.js < 10.0.6 is locked to plugin version 1.1.3. To use the latest plugin version, upgrade to Next.js >= 10.0.6.

### Fallback Pages

As of v3.3.0, this plugin uses Netlify's [On-Demand Builders](https://docs.netlify.com/configure-builds/on-demand-builders/) for pages that use `fallback: true` or `fallback: blocking` in getStaticPaths. This means the page is built once and then cached until a future deploy. This is Netlify's first step towards solving the problem ISR originally set out to solve.

### Incremental Static Regeneration

Using the `revalidate` flag in getStaticProps is not fully supported on Netlify. Currently, this plugin will SSR these pages instead of serving any prerendered/incrementally built HTML. See [this issue](https://github.com/netlify/netlify-plugin-nextjs/issues/151) for more info.
