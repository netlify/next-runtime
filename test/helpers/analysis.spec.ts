import { resolve } from 'pathe'

import { extractConfigFromFile } from '../../packages/runtime/src/helpers/analysis'

describe('static source analysis', () => {
  beforeEach(() => {
    //  Spy on console.error
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    //  Restore console.error
    ;(console.error as jest.Mock).mockRestore()
  })
  it('should extract config values from a source file', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/background.js'), process.cwd())
    expect(config).toEqual({
      type: 'experimental-background',
    })
  })
  it('should extract config values from a TypeScript source file', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/background.ts'), process.cwd())
    expect(config).toEqual({
      type: 'experimental-background',
    })
  })
  it('should return an empty config if not defined', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/missing.ts'), process.cwd())
    expect(config).toEqual({})
  })

  it('should return an empty config if config is invalid', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/invalid.ts'), process.cwd())
    expect(config).toEqual({})
  })

  it('should extract schedule values from a source file', async () => {
    const config = await extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/scheduled.ts'), process.cwd())
    expect(config).toEqual({
      type: 'experimental-scheduled',
      schedule: '@daily',
    })
  })
  it('should throw if schedule is provided when type is background', async () => {
    await expect(
      extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/background-schedule.ts'), process.cwd()),
    ).rejects.toThrow('Unsupported config value in test/fixtures/analysis/background-schedule.ts')
    expect(console.error).toHaveBeenCalledWith(
      `Invalid config value in test/fixtures/analysis/background-schedule.ts: schedule is not allowed unless type is "experimental-scheduled"`,
    )
  })
  it('should throw if schedule is provided when type is default', async () => {
    await expect(
      extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/default-schedule.ts'), process.cwd()),
    ).rejects.toThrow('Unsupported config value in test/fixtures/analysis/default-schedule.ts')
    expect(console.error).toHaveBeenCalledWith(
      `Invalid config value in test/fixtures/analysis/default-schedule.ts: schedule is not allowed unless type is "experimental-scheduled"`,
    )
  })
  it('should throw if schedule is not provided when type is scheduled', async () => {
    await expect(
      extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/missing-schedule.ts'), process.cwd()),
    ).rejects.toThrow('Unsupported config value in test/fixtures/analysis/missing-schedule.ts')
    expect(console.error).toHaveBeenCalledWith(
      `Invalid config value in test/fixtures/analysis/missing-schedule.ts: schedule is required when type is "experimental-scheduled"`,
    )
  })
  it('should throw if edge runtime is specified for scheduled functions', async () => {
    await expect(
      extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/scheduled-edge.ts'), process.cwd()),
    ).rejects.toThrow('Unsupported config value in test/fixtures/analysis/scheduled-edge.ts')
    expect(console.error).toHaveBeenCalledWith(
      `Invalid config value in test/fixtures/analysis/scheduled-edge.ts: edge runtime is not supported for scheduled functions`,
    )
  })
  it('should throw if edge runtime is specified for background functions', async () => {
    await expect(
      extractConfigFromFile(resolve(__dirname, '../fixtures/analysis/background-edge.ts'), process.cwd()),
    ).rejects.toThrow('Unsupported config value in test/fixtures/analysis/background-edge.ts')
    expect(console.error).toHaveBeenCalledWith(
      `Invalid config value in test/fixtures/analysis/background-edge.ts: edge runtime is not supported for background functions`,
    )
  })
})
