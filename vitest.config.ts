/* eslint-disable n/no-unpublished-import */
import GithubActionsReporter from 'vitest-github-actions-reporter'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 60000,
    include: ['test/e2e/**/*.spec.ts'],
    reporters: process.env.GITHUB_ACTIONS ? new GithubActionsReporter() : 'default',
  },
})
/* eslint-enable n/no-unpublished-import */
