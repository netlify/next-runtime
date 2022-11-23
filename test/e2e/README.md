# Next.js e2e test suite

The tests in this directory are taken from the Next.js monorepo.
[See the licence](https://github.com/vercel/next.js/blob/canary/license.md). The files in `tests` run unmodofied. The
ones in `modified-tests` either have fixes to run correctly, or have tests disabled. The tests in `disabled-tests` are
current disabled because of either an incompatibility or bug.

The tools in `next-test-lib` are based on the equivalent tools in the Next.js monorepo. The original utilities test the
Next.js code, whereas here they are used to test the Netlify runtime. For this reason only the "deploy" mode is enabled,
and it builds using the runtime packages in this monorepo and deploys using the Netlify CLI. The e2e tests then run
against the deployed site.

The script that runs these is in
[.github/workflows/e2e-next.yml](https://github.com/netlify/next-runtime/blob/main/.github/workflows/e2e-next.yml). It
runs all the tests in parallel using a matrix, with each running in a separate job. The tests are run against the
version of the Next Runtime that is currently in the monorepo, and the version of `next` that is in the monorepo's
dependencies.

To run the tests locally, the npm script `test:next` can be used, which runs the default tests. The script
`test:next:all` runs all the tests, including the ones in `disabled-tests` and the other tests skipped by Jest. The
script `test:next:disabled` runs only the disabled tests. Unlike in CI, these are run sequentially, so will take a long
time to run, so you may want to just run a single test suite. To run a single suite run
`npm run test:next:all -- the-test-name-here`, e.g. `npm run test:next:all -- streaming-ssr`. The name is matched as a
pattern against the path of the test file and can be a partial match.

When they are run, the tests generate the sites in a temporary directory, and then deploy them to Netlify. The e2e tests
are then run against these. This can be overridden by setting the env var `SITE_URL`, which will be used instead of
deploying the test site. This only makes sense when running a single test suite, because each test suite runs against a
different site.

The tmp directory with each test site is deleted after the tests have been run. If you want to manually build or deploy
the test sites, you can run the test command, and then you can kill the test process after it has generated the site.
The location of the tmp directory is printed in the console. Alternatively, set the env var `NEXT_TEST_SKIP_CLEANUP` and
the site directories will all be retained.
