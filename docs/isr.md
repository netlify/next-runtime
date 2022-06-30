## Incremental Static Regeneration (ISR)

[Incremental static regeneration](https://vercel.com/docs/concepts/next.js/incremental-static-regeneration) is a feature
of Next.js that allows pages to be updated after a site has been built and deployed. It is now fully supported in
Netlify by the Essential Next.js plugin, meaning large sites can update pages without needing to rebuild the entire
site. Unlike server-side rendered pages, the page is not rebuilt for each user, so they load quickly, but unlike
statically-generated pages they can be periodically updated with new content without a new deploy.

### Using ISR on Netlify

ISR on Netlify is implemented with [On Demand Builders](https://docs.netlify.com/configure-builds/on-demand-builders/),
using the TTL feature. You can enable ISR for a page by returning a value for `revalidate` from the `getStaticProps`
function. This value is the number of seconds for which the content will be considered fresh. If a request arrives for a
page after the `revalidate` period has elapsed, the page will be regenerated. ISR uses a "stale while revalidate"
strategy, meaning that the visitor still receives the stale content, but it is regenerated in the background ready for
the next request. The generated page is persisted globally, so is available to all visitors wherever they are in the
world. It is also cached in the global Netlify CDN so responses are fast.

The minimum value for `revalidate` is 60 seconds, and any value less than that will be rounded-up to 60 seconds. After a
request is made for stale content, the page will be regenerated in the background and immediately persisted globally,
but it can take up to 60 seconds before the new content is then updated in all CDN nodes if they already had a cached
copy.

If the static regeneration relies on local files in your repository they need to be bundled with the handler functions.
This can be done by modifying your
[file based configuration](https://docs.netlify.com/configure-builds/file-based-configuration). An entry to the
`included_files` option needs to be added under the `functions` option. You should be careful to not include unnecessary
files, particularly large files such as images or videos, because there is a 50MB size limit for each handler function.
See [Functions Configuration Docs](https://docs.netlify.com/configure-builds/file-based-configuration/#functions) for
more info. Update your `netlify.toml` file to include the following (assuming local content is located in the /content
directory):

```toml
[functions]
included_files = ["content/**"]
```

If you only need the content for DSG pages, then you can target only that function like this:

```toml
[functions.__dsg]
included_files = ["content/**"]
```

or, for SSR pages:

```toml
[functions.__ssr]
included_files = ["content/**"]
```

If a new deploy is made, all persisted pages and CDN cached pages will be invalidated so that conflicts are avoided. If
this did not happen, a stale HTML page might make a request for an asset that no longer exists in the new deploy. By
invalidating all persisted pages, you can be confident that this will never happen and that deploys remain atomic.

### On-demand ISR

On-Demand ISR (where a path is manually revalidated) is not currently supported on Netlify.
[Please let us know](https://github.com/netlify/netlify-plugin-nextjs/discussions/1228) if this feature would be useful
to you, and if so how you would plan to use it.

### Alternatives to ISR

ISR is best for situations where there are regular updates to content throughout the day, particularly you don't have
control over when it happens. It is less ideal in situations such as a CMS with incremental updates where you can have
the CMS trigger a deploy when a page is added or edited. This offers the best performance and avoids unnecesary
rebuilds.

#### Static site generation

For high-traffic pages you can use
[static generation](https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation) without
`revalidate`, which deploys static files directly to the CDN for maximum performance.

#### Distributed persistent rendering

For less commonly-accessed content you can use return `fallback: "blocking"` from
[`getStaticPaths`](https://nextjs.org/docs/basic-features/data-fetching#getstaticpaths-static-generation) and defer
builds until the first request. This also uses On Demand Builders, but persists the built page until the next deploy.
This is great for long-tail content and archives that don't change often but are not accessed often enough to justify
statically-generating them at build time.
