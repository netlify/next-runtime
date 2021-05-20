![Next.js on Netlify Build Plugin](next-on-netlify.png)

# Essential Next.js Build Plugin

<p align="center">
  <a aria-label="npm version" href="https://www.npmjs.com/package/@netlify/plugin-nextjs">
    <img alt="" src="https://img.shields.io/npm/v/@netlify/plugin-nextjs">
  </a>
  <a aria-label="MIT License" href="https://img.shields.io/npm/l/@netlify/plugin-nextjs">
    <img alt="" src="https://img.shields.io/npm/l/@netlify/plugin-nextjs">
  </a>
</p>

This build plugin is a utility for supporting Next.js on Netlify. To enable server-side rendering and other framework-specific features in your Next.js application on Netlify, you will need to install this plugin for your app.

## Table of Contents

- [Installation and Configuration](#installation-and-configuration)
- [CLI Usage](#cli-usage)
- [Custom Netlify Functions](#custom-netlify-functions)
- [Publish Directory](#publish-directory)
- [Custom Netlify Redirects](#custom-netlify-redirects)
- [Local Files in Runtime](#local-files-in-runtime)
- [FAQ](#faq)
- [Caveats](#caveats)
- [Credits](#credits)
- [Showcase](#showcase)

## Installation and Configuration

### For new Next.js sites

As of v3.0.0, all new sites deployed to Netlify with Next.js will automatically install this plugin for a seamless experience deploying Next.js on Netlify!

This means that you don't have to do anything — just build and deploy your site to Netlify as usual and we'll handle the rest.

You're able to [remove the plugin](https://docs.netlify.com/configure-builds/build-plugins/#remove-a-plugin) at any time by visiting the **Plugins** tab for your site in the Netlify UI.

### For existing Next.js sites

### UI Installation

If your Next.js project was already deployed to Netlify pre-3.0.0, use the Netlify UI to [install the Essential Next.js Build Plugin](http://app.netlify.com/plugins/@netlify/plugin-nextjs/install) in a few clicks.

### Manual installation

1\. Create a `netlify.toml` in the root of your project. Your file should include the plugins section below:

```toml
[build]
  command = "npm run build"
  publish = "out"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Note: the plugin does not run for statically exported Next.js sites (aka sites that use `next export`). To use the plugin, you should use the `[build]` config in the .toml snippet above. Be sure to exclude `next export` from your build script.

 You can also add context-specific properties and environment variables to your `netlify.toml`. Read more about [deploy contexts](https://docs.netlify.com/configure-builds/file-based-configuration/#deploy-contexts) in our docs. For example:

```toml
[context.production.environment]
NEXT_SERVERLESS = "true"
NODE_ENV = "production"
```

2\. From your project's base directory, use `npm`, `yarn`, or any other Node.js package manager to add this plugin to `devDependencies` in `package.json`.

```
npm install --save @netlify/plugin-nextjs
```

or

```
yarn add @netlify/plugin-nextjs
```

Read more about [file-based plugin installation](https://docs.netlify.com/configure-builds/build-plugins/#file-based-installation) in our docs.

## CLI Usage

If you'd like to build and deploy your project using the [Netlify CLI](https://docs.netlify.com/cli/get-started/), we recommend this workflow to manage git tracking plugin-generated files:

1. Make sure all your project's files are committed before running a build with the CLI
2. Run any number of builds and deploys freely (i.e. `netlify build`, `netlify deploy --build`, `netlify deploy --prod`)
3. Run `git stash --include-unstaged` to easily ignore plugin-generated files

Plugin-generated files will output into either (a) the default functions and publish directories (`netlify/functions` and `.`, respectively) or (b) whichever custom functions and publish directories you configure. See below for custom directory configuration. It's important to note that, in both cases (a) and (b), the CLI may mix your project's source code and plugin-generated files; this is why we recommend committing all project source files before running CLI builds.

**Debugging CLI builds:**
- If you're seeing a `{FILE_NAME} already exists` error running a CLI build, this may be because your `node_modules` got purged between builds or because of lingering unstashed files from outdated builds. To resolve, you need to manually remove any plugin-generated files from your project directory.

We're looking to improve the CLI experience to avoid this manual cleanup and git management! Feel free to open an issue to report feedback on the CLI experience.

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

## Image handling

The plugin includes a function to generate images for `next/image`. The images are resized on the fly, so the first request will have a short delay. However because the function uses [On-Demand Builders](https://docs.netlify.com/configure-builds/on-demand-builders/), any subsequent requests for that image are served from the edge cache and are super-fast.

By default, images are returned in the same format as the source image if they are in JPEG, PNG, WebP or AVIF format. If you are only targeting modern browsers and want to live life on the edge, you can [set the environment variable](https://docs.netlify.com/configure-builds/environment-variables/) `FORCE_WEBP_OUTPUT` to `"true"`, and it will return all images in WebP format. This will often lead to significant improvements in file size. However you should not use this if you need to support older browsers, as `next/image` does not support picture tag source fallback and images will appear broken. Check [browser support](https://caniuse.com/webp) to see if you are happy to do this.

If you want to use remote images in `next/image`, you will need to add the image domains to an allow list. Setting them in `images.domains` in `next.config.js` is not supported: instead you should set the environment variable `NEXT_IMAGE_ALLOWED_DOMAINS` to a comma-separated list of domains, e.g. `NEXT_IMAGE_ALLOWED_DOMAINS="placekitten.com,unsplash.com"`. 

## Custom Netlify Redirects

You can define custom redirects in a `_redirects` file.
The precedence of these rules are:

- `_redirects`
- `next-on-netlify` redirects

Read more about [Netlify redirects](https://docs.netlify.com/routing/redirects/) in our docs.

## Local Files in Runtime

A common requirement for Next.js projects is to require local files in Next.js pages (see [markdown issue](https://github.com/netlify/netlify-plugin-nextjs/issues/153) and [i18next issue](https://github.com/netlify/netlify-plugin-nextjs/issues/223) as examples).

In this case, you can configure your netlify.toml to make sure these files are included in the function runtime environment. This is necessary for pages that use fallback: true, SSR, preview mode, etc. For example:

```toml
[build]
  command = "npm run build"

[functions]
  # Includes all Markdown files inside the "files/" directory.
  included_files = ["files/*.md"]
```

Read more about functions configuration and `included_files` in our [docs](https://docs.netlify.com/configure-builds/file-based-configuration/#functions).

## FAQ

**Q: What can I do if my builds fail suddenly from a broken plugin release or plugin dependency?**

A: Check out the plugin's [releases](https://github.com/netlify/netlify-plugin-nextjs/releases). You can manually install `npm install --save @netlify/plugin-nextjs@3.x.x` at the last working version.
Once a new working release is out, you can uninstall the plugin at this locked version (`npm uninstall --save @netlify/plugin-nextjs`), which will re-enable Netlify's build system to use the latest plugin version by default.

## Caveats

### Versions

You can check our `package.json` for supported Node versions.

For breaking Next.js releases, all Next.js versions before the breaking release will be locked to the last working plugin version:

Next.js < 10.0.6 is locked to plugin version 1.1.3. To use the latest plugin version, upgrade to Next.js >= 10.0.6.

### Fallback Pages

As of v3.3.0, this plugin uses Netlify's [On-Demand Builders](https://docs.netlify.com/configure-builds/on-demand-builders/) for pages that use `fallback: true` or `fallback: blocking` in getStaticPaths. This means the page is built once and then cached until a future deploy. This is Netlify's first step towards solving the problem ISR originally set out to solve.

### Incremental Static Regeneration

Using the `revalidate` flag in getStaticProps is not fully supported on Netlify. Currently, this plugin will SSR these pages instead of serving any prerendered/incrementally built HTML. See [this issue](https://github.com/netlify/netlify-plugin-nextjs/issues/151) for more info.

## Credits

This package extends the project [next-on-netlify](https://github.com/netlify/next-on-netlify), authored originally by [Finn Woelm](https://github.com/finnwoelm).
