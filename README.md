![Next.js on Netlify Build Plugin](nextonnetlify.png)

# Next.js Build Plugin

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
- [Custom Netlify Functions](#custom-netlify-functions)
- [Publish Directory](#publish-directory)
- [Custom Netlify Redirects](#custom-netlify-redirects)
- [Caveats](#caveats)
- [Credits](#credits)
- [Showcase](#showcase)

## Installation and Configuration

There are two ways to install the plugin in your Next.js on Netlify site.

**Option 1: UI-based Installation**

This plugin can be installed and managed from your site's settings on Netlify.

[👉 Click to install this plugin 👈](http://app.netlify.com/plugins/@netlify/plugin-nextjs/install)

Read more about [UI-based plugin installation](https://docs.netlify.com/configure-builds/build-plugins/#ui-installation) in our docs.

**Option 2: File-based Installation**

Create a `netlify.toml` in the root of your project. Your file should include the plugins section below:

```toml
[build]
  command   = "npm run build"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Read more about [file-based plugin installation](https://docs.netlify.com/configure-builds/build-plugins/#file-based-installation) in our docs.

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

## Custom Netlify Redirects

You can define custom redirects in a `_redirects` file.
The precedence of these rules are:

- `_redirects`
- `next-on-netlify` redirects

Read more about [Netlify redirects](https://docs.netlify.com/routing/redirects/) in our docs.

## Caveats

### Versions

You can check our `package.json` for supported Next and Node versions. Our support of Next 10 is currently experimental.

### CLI

This plugin is currently not stable for use with the Netlify CLI. Support for the plugin is in development.

### Fallbacks for Pages with `getStaticPaths`

[Fallback pages](https://nextjs.org/docs/basic-features/data-fetching#fallback-true) behave differently with this plugin than they do with Next.js. On Next.js, when navigating to a path that is not defined in `getStaticPaths`, it first displays the fallback page. Next.js then generates the HTML in the background and caches it for future requests.

With this plugin, when navigating to a path that is not defined in `getStaticPaths`, it server-side renders the page and sends it directly to the user. The user never sees the fallback page. The page is not cached for future requests.

For more on this, see: [Issue #7](https://github.com/netlify/next-on-netlify/issues/7#issuecomment-636883539)

## Credits

This package is maintained by [Lindsay Levine](https://github.com/lindsaylevine) and [Cassidy Williams](https://github.com/cassidoo). It extends the project [next-on-netlify](https://github.com/netlify/next-on-netlify), authored originally by [Finn Woelm](https://github.com/finnwoelm).

## Showcase

The following sites are built with `next-on-netlify`:

![opinionatedreact.com](https://raw.githubusercontent.com/netlify/next-on-netlify/master/assets/showcase-opinionatedreact.png)  
[opinionatedreact.com](https://opinionatedreact.com/) ([via Twitter](https://twitter.com/NikkitaFTW/status/1302667952920162309))

![missionbit.org](https://raw.githubusercontent.com/netlify/next-on-netlify/master/assets/showcase-missionbit.png)  
[missionbit.org](https://www.missionbit.org/) ([#18](https://github.com/netlify/next-on-netlify/pull/18#issuecomment-643828966))
