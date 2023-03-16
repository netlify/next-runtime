import { readJSON } from 'fs-extra'
import mock from 'mock-fs'
import { join } from 'pathe'
import { NEXT_PLUGIN_NAME } from '../packages/runtime/src/constants'
import { writeFunctionConfiguration } from '../packages/runtime/src/helpers/utilities/functions'

describe('writeFunctionConfiguration', () => {
  const nextRuntimeVersion = '29.3.4'

  beforeEach(() => {
    mock({
      '.netlify/plugins/package.json': JSON.stringify({
        name: 'test',
        version: '1.0.0',
        dependencies: {
          '@netlify/plugin-nextjs': nextRuntimeVersion,
        },
      }),
      '.netlify/functions/some-folder/someFunctionName/someFunctionName.json': '',
    })
  })

  afterEach(() => {
    mock.restore()
  })

  it('should write the configuration for a function', async () => {
    const functionName = 'someFunctionName'
    const functionTitle = 'some function title'
    const functionsDir = '.netlify/functions/some-folder'

    const expected = {
      config: {
        name: functionTitle,
        generator: nextRuntimeVersion ? `${NEXT_PLUGIN_NAME}@${nextRuntimeVersion}` : 'Next Runtime Version Not Found',
      },
      version: 1,
    }

    const filePathToSaveTo = join(functionsDir, functionName, `${functionName}.json`)
    await writeFunctionConfiguration(functionName, functionTitle, functionsDir)
    const actual = await readJSON(filePathToSaveTo)

    expect(actual).toEqual(expected)
  })
})
