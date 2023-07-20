import type { NetlifyPluginOptions, NetlifyPluginUtils } from '@netlify/build'
import Chance from 'chance'
import { outdent } from 'outdent'

import logger from '../../packages/runtime/src/helpers/logger'
import {
  checkNextSiteHasBuilt,
  checkZipSize,
  getProblematicUserRewrites,
} from '../../packages/runtime/src/helpers/verification'
import { describeCwdTmpDir, moveNextDist } from '../test-utils'

const netlifyConfig = {
  build: { command: 'npm run build' },
  functions: {},
  redirects: [],
  headers: [],
} as NetlifyPluginOptions['netlifyConfig']

type FailBuild = NetlifyPluginUtils['build']['failBuild']

const chance = new Chance()

const { existsSync } = require('fs')

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
}))

// disable chalk colors to easier validate console text output
jest.mock(`chalk`, () => {
  process.env.FORCE_COLOR = '0'
  return jest.requireActual('chalk')
})

describe('checkNextSiteHasBuilt', () => {
  let failBuildMock

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
  let loggerWarnSpy, loggerInfoSpy
  const { existsSync, promises } = require('fs')

  beforeEach(() => {
    loggerWarnSpy = jest.spyOn(logger, 'warn')
    loggerWarnSpy.mockClear()
    loggerInfoSpy = jest.spyOn(logger, 'info')
    loggerInfoSpy.mockClear()
    process.env.DISABLE_BUNDLE_ZIP_SIZE_CHECK = 'false'
  })

  afterEach(() => {
    delete process.env.DISABLE_BUNDLE_ZIP_SIZE_CHECK
  })

  afterAll(() => {
    loggerWarnSpy.mockReset()
    loggerInfoSpy.mockReset()
    existsSync.mockReset()
  })

  it('emits a warning that DISABLE_BUNDLE_ZIP_SIZE_CHECK was enabled', async () => {
    process.env.DISABLE_BUNDLE_ZIP_SIZE_CHECK = 'true'
    await checkZipSize(chance.string())
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      'Function bundle size check was DISABLED with the DISABLE_BUNDLE_ZIP_SIZE_CHECK environment variable. Your deployment will break if it exceeds the maximum supported size of function zip files in your account.',
    )
  })

  it('does not emit a warning if the file size is below the warning size', async () => {
    existsSync.mockReturnValue(true)
    jest.spyOn(promises, 'stat').mockResolvedValue({ size: 1024 * 1024 * 20 })

    await checkZipSize('some-file.zip')

    expect(loggerWarnSpy).not.toHaveBeenCalled()
  })

  it('emits a warning if the file size is above the warning size', async () => {
    existsSync.mockReturnValue(true)
    jest.spyOn(promises, 'stat').mockResolvedValue({ size: 1024 * 1024 * 200 })

    try {
      await checkZipSize('some-file.zip')
    } catch {
      // StreamZip is not mocked, so ultimately the call will throw an error,
      // but we are logging message before that so we can assert it
    }

    expect(loggerInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'The function zip some-file.zip size is 210 MB, which is larger than the recommended maximum size of 52.4 MB.',
      ),
    )
  })
})

describeCwdTmpDir('getProblematicUserRewrites', () => {
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
