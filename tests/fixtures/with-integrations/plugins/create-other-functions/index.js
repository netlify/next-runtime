const { cp } = require('node:fs/promises')
const { join } = require('node:path')

exports.onPreBuild = async function onPreBuild({
  constants: { INTERNAL_FUNCTIONS_SRC, INTERNAL_EDGE_FUNCTIONS_SRC },
}) {
  // copying functions:
  //   - mocked functions to represent stale function produced by @netlify/plugin-nextjs (specified by `generator`) for v4 and v5 of runtime
  //   - mocked functions to represent functions produced by other build plugins (either specified by `generator` or missing `generator` metadata)
  await Promise.all([
    cp(join(__dirname, 'edge-functions'), INTERNAL_EDGE_FUNCTIONS_SRC, { recursive: true }),
    cp(join(__dirname, 'functions-internal'), INTERNAL_FUNCTIONS_SRC, { recursive: true }),
  ])
}
