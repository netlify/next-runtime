import { defineConfig } from 'vitest/config'
import { W } from 'vitest/dist/reporters-5f784f42'
import { BaseSequencer } from 'vitest/node'

class Sequencer extends BaseSequencer {
  async shard(projects: W[]): Promise<W[]> {
    const {
      config: { shard: { index = 1, count = 1 } = {} },
    } = this.ctx

    if (count === 1) {
      console.log('No test sharding configured please specify with --shard 1/3')
      return projects
    }
    console.log(`Sharding configured to run on ${index}/${count}`)

    // Find the index of the project to run on a single executor
    const specialTestIndex = projects.findIndex((project) =>
      project[1].endsWith('tests/integration/fetch-handler.test.ts'),
    )

    if (specialTestIndex === -1) {
      throw new Error('Could not find special test to run on single executor!')
    }

    // If this is the first shard, run only the special test
    if (index === 1) {
      console.log(`Running tests: \n  - ${projects[specialTestIndex][1]}\n\n`)
      return [projects[specialTestIndex]]
    }

    // Remove the special test from the array
    const filteredProjects = projects.filter((_, i) => i !== specialTestIndex)

    // Calculate the range of tests to run on this shard
    const testsPerShard = Math.ceil(filteredProjects.length / (count - 1))
    const start = testsPerShard * (index - 2)
    const end = start + testsPerShard

    // Return the subset of tests for this shard
    const sliced = filteredProjects.slice(start, end)
    console.log(`Running tests: \n  - `, sliced.map((test) => test[1]).join('  - '), '\n\n')
    return sliced
  }
}

export default defineConfig({
  root: '.',
  test: {
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
