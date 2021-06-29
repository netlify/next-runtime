## Using in a monorepo or subdirectory

The Essential Next.js plugin works in most monorepos, but may need some configuration changes. This depends on the type of monorepo and the tooling that you use.

### Self-contained subdirectory

If your Next.js site is in a subdirectory of the repo, but doesn't rely on installing or compiling anything outside of that directory, then the simplest arrangement is to set the `base` of the site to that directory. This can be done either in the Netlify dashboard or in the `netlify.toml`. If your site is in `/frontend`, you should set up your site with the following in the root of the repo:

```toml
# ./netlify.toml
[build]
  base="frontend"
```
You can then place another `netlify.toml` file in `/frontend/` that configures the actual build:

```toml
# ./frontend/netlify.toml

[build]
  command = "npm run build"
  publish = "out"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Yarn workspace

If your site is a yarn workspace - including one that uses lerna - you should keep the base as the root of the repo, but change the configuration as follows. Assuming the site is in `/packages/frontend/`:

```toml
# ./netlify.toml

[build]
  command = "next build packages/frontend"
  publish = "packages/frontend/out"

[dev]
  command = "next dev packages/frontend"
  
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Ensure that the `next.config.js` is in the site directory, i.e. `/packages/frontend/next.config.js`. You must ensure that there is either a `yarn.lock` in the root of the site, or the environment variable `NETLIFY_USE_YARN` is set to true.

### Lerna monorepo using npm

If your monorepo uses Yarn workspaces, then set it up as shown above in the Yarn workspace section. If it uses npm then it is a little more complicated. First, you need to ensure that the `next` package is installed as a top-level dependency, i.e. it is in `./package.json` rather than `packages/frontend/package.json`. This is because it needs to be installed before lerna is bootstrapped as the build plugin needs to use it. Generally, hoisting as many packages to the top level as possible is best, so that they are more efficiently cached. You then should change the build command, and make it similar to this:

```toml
# ./netlify.toml

[build]
  command = "lerna bootstrap && next build packages/frontend"
  publish = "packages/frontend/out"

[dev]
  command = "next dev packages/frontend"
  
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### Nx

[Nx](https://nx.dev/) is a build framework that handles scaffolding, building and deploying projects. It has support for Next.js via the `@nrwl/next` package. When building a Next.js site, it changes a lot of the configuraiton on the fly, and has quite a different directory structure to a normal Next.js site. The Essential Next.js plugin has full support for sites that use Nx, but there are a few required changes that you must make to the configuration.

First, you need to make the `publish` directory point at a dirctory called `out` inside the app directory, rather than the build directory. If your app is called `myapp`, your `netlify.toml` should look something like:

```toml
# ./netlify.toml

[build]
  command = "npm run build"
  publish = "apps/myapp/out"

[dev]
  command = "npm run start"
  targetPort = 4200
  
[[plugins]]
  package = "@netlify/plugin-nextjs"
```

You also need to make a change to the `next.config.js` inside the app directory. By default, Nx changes the Next.js `distDir` on the fly, changing it to a directory in the root of the repo. The Essential Next.js plugin can't read this value, so has no way of determining where the build files can be found. However, if you change the `distDir` in the config to anything except `.next`, then `Nx` will leave it unchanged, and the Essential Next.js plugin can read the value from there. e.g. 

```js
// ./apps/myapp/next.config.js

const withNx = require('@nrwl/next/plugins/with-nx');

module.exports = withNx({
  distDir: '.dist',
  target: 'serverless'
});

```

### Other monorepos

Other arrangements may work: for more details, see [the monorepo documentation](https://docs.netlify.com/configure-builds/common-configurations/monorepos/). The important points are:

1. The `next` package must be installed as part of the initial `npm install` or `yarn install`, not from the build command.
2. The `publish` directory must be called `out`, and should be in the same directory as the `next.config.js` file. e.g.
   
   ```
   backend/
   frontend/
           |- next.config.js
           |- out
   netlify.toml 
   package.json
   ```
If you have another monorepo tool that you are using, we would welcome PRs to add instructions to this document.