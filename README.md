# Next.js Runtime

Next.js is supported natively on Netlify, and in most cases you will not need to install or
configure anything. This repo includes the packages used to support Next.js on Netlify.

## Lambda Folder structure:

For a simple next.js app

```
/___netlify-server-handler
├── .netlify
│   ├── tags-manifest.json
│   └── dist // the compiled runtime code
│       └── run
│           ├── handlers
│           │   ├── server.js
│           │   └── cache.cjs
│           └── next.cjs
├── .next // or distDir name from the next.config.js
│   └── // content from standalone
├── run-config.json // the config object from the required-server-files.json
├── node_modules
├── ___netlify-server-handler.json
├── ___netlify-server-handler.mjs
└── package.json
```

## Testing

### Integration testing

How to add new integration test scenarios to the application:

1. Create a new folder under `tests/fixtures/<your-name>`
2. Adapt the `next.config.js` to be a standalone application
3. Create a `postinstall` script that runs the `next build`. It's important to notice that the
   integration tests rely on a already built next.js application in this folder. They rely on the
   `.next` folder.
4. Add your test

> Currently the tests require a built version of the `dist/run/handlers/cache.cjs` so you need to
> run `npm run build` before executing the integration tests.

In addition, the integration tests need to be prepared before first use. You can do this by running
`npm run pretest`. To speed up this process and build only the fixtures whose name starts with a
given prefix, run `npm run pretest -- <prefix>`.

### E2E testing

> **Prerequisite**
>
> Needs the `netlify-cli` installed and being logged in having access to Netlify Testing
> Organization

The e2e tests can be invoked with `npm run e2e` and perform a full e2e test. This means they do the
following:

1. Building the next-runtime (just running `npm run build` in the repository)
2. Creating a temp directory and copying the provided fixture over to the directory.
3. Packing the runtime with `npm pack` to the temp directory.
4. Installing the runtime from the created zip artifact of `npm pack` (this is like installing a
   node_module from the registry)
5. Creating a `netlify.toml` inside the temp directory of the fixture and adding the runtime as a
   plugin.
6. Running `netlify deploy --build` invoking the runtime. This will use the
   [next-runtime-testing](https://app.netlify.com/sites/next-runtime-testing/overview) as site to
   deploy to.
7. Using the `deployId` and `url` of the deployed site to run some
   [playwright](https://playwright.dev/) tests against, asserting the correctness of the runtime.
8. After the tests where run successfully, it will delete the deployment again and clean everything
   up. In case of a failure, the deploy won't be cleaned up to leave it for troubleshooting
   purposes.

> [!TIP] If you'd like to always keep the deployment and the local fixture around for
> troubleshooting, run `E2E_PERSIST=1 npm run e2e`.

#### cleanup old deploys

To cleanup old and dangling deploys from failed builds you can run the following script:

```bash
npx tsx ./tools/e2e/cleanup-deploys.ts
```

This will cleanup all created deploys on the
[next-runtime-testing](https://app.netlify.com/sites/next-runtime-testing/overview) site.
