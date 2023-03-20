import { join } from 'path'
import { existsSync } from 'fs-extra'
import { HANDLER_FUNCTION_NAME } from '../constants'
import { restoreCache } from '../helpers/cache'
import {
  verifyNetlifyBuildVersion,
  checkForRootPublish,
} from '../helpers/verification'
import { shouldSkip } from '../helpers/utils'

export const onPreBuild = async ({
  constants,
  netlifyConfig,
  utils: {
    build: { failBuild },
    cache,
  },
}) => {
  const { publish } = netlifyConfig.build
  if (shouldSkip()) {
    await restoreCache({ cache, publish })
    console.log('Not running Next Runtime')
    if (existsSync(join(constants.INTERNAL_FUNCTIONS_SRC, HANDLER_FUNCTION_NAME))) {
      console.log(`Please ensure you remove any generated functions from ${constants.INTERNAL_FUNCTIONS_SRC}`)
    }
    return
  }
  checkForRootPublish({ publish, failBuild })
  verifyNetlifyBuildVersion({ failBuild, ...constants })

  await restoreCache({ cache, publish })

  netlifyConfig.build.environment ||= {}
  // eslint-disable-next-line unicorn/consistent-destructuring
  netlifyConfig.build.environment.NEXT_PRIVATE_TARGET = 'server'
}
