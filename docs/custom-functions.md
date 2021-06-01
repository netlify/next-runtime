## Custom Netlify Functions

This plugin creates one Netlify Function for each Next.js page that requires one.
To use custom Netlify Functions in addition to what the plugin generates, add a path to your functions folder in `netlify.toml`:

```toml
[build]
  command   = "npm run build"
  functions = "my_functions_dir"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Read more about [Netlify Functions](https://docs.netlify.com/functions/overview/) in our docs.

## Publish Directory

Similarly, you can customize your publish directory in your `netlify.toml` file:

```toml
[build]
  command   = "npm run build"
  functions = "my_functions_dir"
  publish   = "my_publish_dir"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Read more about [Netlify's build settings](https://docs.netlify.com/configure-builds/get-started/#basic-build-settings) in our docs.

