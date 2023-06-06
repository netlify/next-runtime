import { readJSON } from 'fs-extra'
import mock from 'mock-fs'
import { join } from 'pathe'

import { NEXT_PLUGIN_NAME } from '../../packages/runtime/src/constants'
import { writeFunctionConfiguration } from '../../packages/runtime/src/helpers/functionsMetaData'
import { getFunctionNameForPage } from '../../packages/runtime/src/helpers/utils'

describe('writeFunctionConfiguration', () => {
  afterEach(() => {
    mock.restore()
  })

  it('should write the configuration for a function using node modules version of @netlify/plugin-nextjs', async () => {
    const nextRuntimeVersion = '23.4.5'

    mock({
      '.netlify/plugins/package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          '@netlify/plugin-nextjs': '29.3.4',
        },
      }),
      'node_modules/@netlify/plugin-nextjs/package.json': JSON.stringify({
        name: '@netlify/plugin-nextjs',
        version: nextRuntimeVersion,
      }),
      '.netlify/functions/some-folder/someFunctionName': {},
    })

    const functionName = 'someFunctionName'
    const functionTitle = 'some function title'
    const functionsDir = '.netlify/functions/some-folder'

    const expected = {
      config: {
        name: functionTitle,
        generator: `${NEXT_PLUGIN_NAME}@${nextRuntimeVersion}`,
      },
      version: 1,
    }

    const filePathToSaveTo = join(functionsDir, functionName, `${functionName}.json`)
    await writeFunctionConfiguration({ functionName, functionTitle, functionsDir })
    const actual = await readJSON(filePathToSaveTo)

    expect(actual).toEqual(expected)
  })

  it('should write the configuration for a function using version of @netlify/plugin-nextjs in package.json', async () => {
    const nextRuntimeVersion = '23.4.5'

    mock({
      '.netlify/plugins/package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          '@netlify/plugin-nextjs': nextRuntimeVersion,
        },
      }),
      '.netlify/functions/some-folder/someFunctionName': {},
    })

    const functionName = 'someFunctionName'
    const functionTitle = 'some function title'
    const functionsDir = '.netlify/functions/some-folder'

    const expected = {
      config: {
        name: functionTitle,
        generator: `${NEXT_PLUGIN_NAME}@${nextRuntimeVersion}`,
      },
      version: 1,
    }

    const filePathToSaveTo = join(functionsDir, functionName, `${functionName}.json`)
    await writeFunctionConfiguration({ functionName, functionTitle, functionsDir })
    const actual = await readJSON(filePathToSaveTo)

    expect(actual).toEqual(expected)
  })

  it('should write the configuration for a function with runtime version not found', async () => {
    mock({
      '.netlify/functions/some-folder/someFunctionName': {},
    })

    const functionName = 'someFunctionName'
    const functionTitle = 'some function title'
    const functionsDir = '.netlify/functions/some-folder'

    const expected = {
      config: {
        name: functionTitle,
        generator: '@netlify/next-runtime@unknown',
      },
      version: 1,
    }

    const filePathToSaveTo = join(functionsDir, functionName, `${functionName}.json`)
    await writeFunctionConfiguration({ functionName, functionTitle, functionsDir })
    const actual = await readJSON(filePathToSaveTo)

    expect(actual).toEqual(expected)
  })

  it('test', () => {
    expect(getFunctionNameForPage('/api/shows/[id]')).toEqual('index')
  })
})
