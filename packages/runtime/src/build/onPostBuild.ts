import { join } from 'path'

import { ODB_FUNCTION_NAME } from '../constants'
import { saveCache } from '../helpers/cache'
import {
  getNextConfig,
  generateCustomHeaders,
} from '../helpers/config'
import {
  warnOnApiRoutes,
} from '../helpers/functions'
import { shouldSkip } from '../helpers/utils'
import {
  checkZipSize,
  checkForOldFunctions,
  warnForProblematicUserRewrites,
  warnForRootRedirects,
} from '../helpers/verification'

export const onPostBuild = async ({
  netlifyConfig: {
    build: { publish },
    redirects,
    headers,
  },
  utils: {
    status,
    cache,
    functions,
    build: { failBuild },
  },
  constants: { FUNCTIONS_DIST },
}) => {
  await saveCache({ cache, publish })

  if (shouldSkip()) {
    status.show({
      title: 'Next Runtime did not run',
      summary: `Next cache was stored, but all other functions were skipped because ${
        process.env.NETLIFY_NEXT_PLUGIN_SKIP
          ? `NETLIFY_NEXT_PLUGIN_SKIP is set`
          : `NEXT_PLUGIN_FORCE_RUN is set to ${process.env.NEXT_PLUGIN_FORCE_RUN}`
      }`,
    })
    return
  }

  await checkForOldFunctions({ functions })
  await checkZipSize(join(FUNCTIONS_DIST, `${ODB_FUNCTION_NAME}.zip`))
  const nextConfig = await getNextConfig({ publish, failBuild })

  const { basePath, appDir, experimental } = nextConfig

  generateCustomHeaders(nextConfig, headers)

  warnForProblematicUserRewrites({ basePath, redirects })
  warnForRootRedirects({ appDir })
  await warnOnApiRoutes({ FUNCTIONS_DIST })
  if (experimental?.appDir) {
    console.log(
      '🧪 Thank you for testing "appDir" support on Netlify. For known issues and to give feedback, visit https://ntl.fyi/next-13-feedback',
    )
  }
}
