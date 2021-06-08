## Local Files in Runtime

A common requirement for Next.js projects is to require local files in Next.js pages (see [markdown issue](https://github.com/netlify/netlify-plugin-nextjs/issues/153) and [i18next issue](https://github.com/netlify/netlify-plugin-nextjs/issues/223) as examples).

When using the Essential Next.js plugin, you can configure your `netlify.toml` to make sure these files are included in the function runtime environment. This is necessary for pages that use fallback: true, SSR, preview mode, etc. For example:

```toml
[build]
  command = "npm run build"

[functions]
  # Includes all Markdown files inside the "files/" directory.
  included_files = ["files/*.md"]
```

Read more about functions configuration and `included_files` in our [docs](https://docs.netlify.com/configure-builds/file-based-configuration/#functions).

