import { extractConfigFromFile } from '../plugin/src/helpers/analysis'
import { resolve } from 'path'
import { getDependenciesOfFile } from '../plugin/src/helpers/files'
describe('static source analysis', () => {
  it('should extract config values from a source file', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, 'fixtures/analysis/background.js'))
    expect(config).toEqual({
      background: true,
    })
  })
  it('should extract config values from a TypeScript source file', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, 'fixtures/analysis/background.ts'))
    expect(config).toEqual({
      background: true,
    })
  })
  it('should return an empty config if not defined', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, 'fixtures/analysis/missing.ts'))
    expect(config).toEqual({})
  })

  it('should return an empty config if config is invalid', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, 'fixtures/analysis/invalid.ts'))
    expect(config).toEqual({})
  })

  it('should extract schedule values from a source file', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, 'fixtures/analysis/scheduled.ts'))
    expect(config).toEqual({
      schedule: '@daily',
    })
  })
})

describe('dependency tracing', () => {
  it('generates dependency list from a source file', async () => {
    const dependencies = await getDependenciesOfFile(resolve(__dirname, 'fixtures/analysis/background.js'))
    expect(dependencies).toEqual(
      ['fixtures/webpack-api-runtime.js', 'package.json'].map((dep) => resolve(__dirname, dep)),
    )
  })
})
