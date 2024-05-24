import { relative } from 'path'

import { getTracer } from './tracer.cjs'

export function enableModuleImportTracing() {
  const cwd = process.cwd()

  const extension = '.js'

  const original = require.extensions[extension]
  if (!original) {
    return
  }

  require.extensions[extension] = function patchedExtensions(module, filename) {
    const startTime = Date.now()
    const ret = original(module, filename)
    const durationMS = Date.now() - startTime
    // if importing module took more than 50ms, create a span for it
    if (durationMS > 50) {
      getTracer().withActiveSpan(
        `module import ${relative(cwd, module.filename)}`,
        { startTime },

        () => {
          // this is no-op because span is created after the work IF work is long enough that
          // warrant creating span for it
        },
      )
    }

    return ret
  }
}
