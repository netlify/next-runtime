import { relative } from 'node:path'
import { defineConfig } from 'vitest/config'
import { W } from 'vitest/dist/reporters-5f784f42'
import { BaseSequencer } from 'vitest/node'

/**
 * Tests that might influence others and should run on an isolated executor (shard)
 * Needs to be relative paths to the repository root.
 */
const RUN_ISOLATED = new Set([
  'tests/integration/fetch-handler.test.ts',
  'tests/integration/revalidate-path.test.ts',
  'tests/integration/cache-handler.test.ts',
])

class Sequencer extends BaseSequencer {
  async shard(projects: W[]): Promise<W[]> {
    const {
      config: { shard: { index = 1, count = 1 } = {} },
    } = this.ctx

    if (count === 1) {
      console.log('[Sequencer]: No test sharding configured please specify with --shard 1/3')
      return projects
    }

    console.log(`[Sequencer]: Sharding configured to run on ${index}/${count}`)
    if (RUN_ISOLATED.size + 1 > count) {
      throw new Error(
        `[Sequencer]: The number of special tests + 1 for the remaining tests (${RUN_ISOLATED.size}) is larger than the node count (${count})
Increasing the node count of the sharding to --shard 1/${RUN_ISOLATED.size}`,
      )
    }

    const specialTests = projects.filter((project) =>
      RUN_ISOLATED.has(relative(process.cwd(), project[1])),
    )
    const regularTests = projects.filter(
      (project) => !RUN_ISOLATED.has(relative(process.cwd(), project[1])),
    )

    // Allocate the first nodes for special tests
    if (index <= RUN_ISOLATED.size) {
      return [specialTests[index - 1]]
    }

    // Distribute remaining tests on the remaining nodes
    if (index > RUN_ISOLATED.size && index <= count) {
      const remainingNodes = count - RUN_ISOLATED.size
      const bucketSize = Math.ceil(regularTests.length / remainingNodes)
      const startIndex = (index - RUN_ISOLATED.size - 1) * bucketSize
      const endIndex = startIndex + bucketSize
      return regularTests.slice(startIndex, endIndex)
    }

    return projects
  }
}

export default defineConfig({
  root: '.',
  test: {
    include: ['{tests/integration,src}/**/*.test.ts'],
    globals: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    unstubEnvs: true,
    unstubGlobals: true,
    environment: 'node',
    testTimeout: 100000,
    setupFiles: ['tests/test-setup.ts'],
    logHeapUsage: true,
    sequence: {
      sequencer: Sequencer,
    },
  },
})
