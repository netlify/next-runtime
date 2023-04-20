import Chance from 'chance'
import { checkNextSiteHasBuilt, checkZipSize, getProblematicUserRewrites } from '../../packages/runtime/src/helpers/verification'
import { outdent } from 'outdent'
import type { NetlifyPluginOptions } from '@netlify/build'
import { moveNextDist } from "../test-utils"

const netlifyConfig = { build: { command: 'npm run build' }, functions: {}, redirects: [], headers: [] } as NetlifyPluginOptions["netlifyConfig"]

import type { NetlifyPluginUtils } from '@netlify/build'
type FailBuild = NetlifyPluginUtils['build']['failBuild']

const chance = new Chance()

jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
  }
})

describe('checkNextSiteHasBuilt', () => {
  let failBuildMock
  const { existsSync } = require('fs')

  beforeEach(() => {
    failBuildMock = jest.fn() as unknown as FailBuild
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
  })

  it('returns error message about incorrectly publishing the ".next" directory when "next export" was run', () => {
    existsSync.mockReturnValue(true)

    const expectedFailureMessage = outdent`
    Detected that "next export" was run, but site is incorrectly publishing the ".next" directory.
    The publish directory should be set to "out", and you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
    `

    checkNextSiteHasBuilt({ publish: '.next', failBuild: failBuildMock })

    expect(failBuildMock).toHaveBeenCalledWith(expectedFailureMessage)
  })

  it('returns error message prompt to change publish directory to ".next"', () => {
    // False for not initially finding the specified 'publish' directory,
    // True for successfully finding a '.next' directory with a production build
    existsSync.mockReturnValueOnce(false).mockReturnValueOnce(true)

    const expectedFailureMessage = outdent`
    The directory "someCustomDir" does not contain a Next.js production build. Perhaps the build command was not run, or you specified the wrong publish directory.
    However, a '.next' directory was found with a production build.
    Consider changing your 'publish' directory to '.next'
    If you are using "next export" then you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
  `

    checkNextSiteHasBuilt({ publish: 'someCustomDir', failBuild: failBuildMock })

    expect(failBuildMock).toHaveBeenCalledWith(expectedFailureMessage)
  })

  it('returns error message prompt when publish directory is set to "out"', () => {
    existsSync.mockReturnValue(false)

    const expectedFailureMessage = outdent`
    The directory "out" does not contain a Next.js production build. Perhaps the build command was not run, or you specified the wrong publish directory.
    Your publish directory is set to "out", but in most cases it should be ".next".
    If you are using "next export" then you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
  `
    checkNextSiteHasBuilt({ publish: 'out', failBuild: failBuildMock })

    expect(failBuildMock).toHaveBeenCalledWith(expectedFailureMessage)
  })

  it('returns default error message when production build was not found', () => {
    existsSync.mockReturnValue(false)
    const expectedFailureMessage = outdent`
    The directory ".next" does not contain a Next.js production build. Perhaps the build command was not run, or you specified the wrong publish directory.
    In most cases it should be set to ".next", unless you have chosen a custom "distDir" in your Next config.
    If you are using "next export" then you should set the environment variable NETLIFY_NEXT_PLUGIN_SKIP to "true".
  `
    checkNextSiteHasBuilt({ publish: '.next', failBuild: failBuildMock })

    expect(failBuildMock).toHaveBeenCalledWith(expectedFailureMessage)
  })
})

describe('checkZipSize', () => {
  let consoleSpy

  beforeEach(() => {
    consoleSpy = jest.spyOn(global.console, 'warn')
  })

  afterEach(() => {
    delete process.env.DISABLE_BUNDLE_ZIP_SIZE_CHECK
  })

  it('emits a warning that DISABLE_BUNDLE_ZIP_SIZE_CHECK was enabled', async () => {
    process.env.DISABLE_BUNDLE_ZIP_SIZE_CHECK = 'true'
    await checkZipSize(chance.string())
    expect(consoleSpy).toHaveBeenCalledWith('Function bundle size check was DISABLED with the DISABLE_BUNDLE_ZIP_SIZE_CHECK environment variable. Your deployment will break if it exceeds the maximum supported size of function zip files in your account.')
  })
})

describe("getProblematicUserRewrites", () => {
  it('finds problematic user rewrites', async () => {
    await moveNextDist()
    const rewrites = getProblematicUserRewrites({
      redirects: [
        { from: '/previous', to: '/rewrites-are-a-problem', status: 200 },
        { from: '/api', to: '/.netlify/functions/are-ok', status: 200 },
        { from: '/remote', to: 'http://example.com/proxying/is/ok', status: 200 },
        { from: '/old', to: '/redirects-are-fine' },
        { from: '/*', to: '/404-is-a-problem', status: 404 },
        ...netlifyConfig.redirects,
      ],
      basePath: '',
    })
    expect(rewrites).toEqual([
      {
        from: '/previous',
        status: 200,
        to: '/rewrites-are-a-problem',
      },
      {
        from: '/*',
        status: 404,
        to: '/404-is-a-problem',
      },
    ])
  })
})
