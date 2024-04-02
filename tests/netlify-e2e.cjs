// @ts-check
const config = {
  version: 2,
  suites: {},
  rules: {
    include: ['test/e2e/**/*.test.{t,j}s{,x}'],
    /** @type {string[]} */
    exclude: [],
  },
}

const rules = require('./test-config.json')

//  Skip non-deploy tests
config.rules.exclude.push(...rules.ignored)

for (const rule of rules.skipped) {
  // Individually-skipped tests
  if (rule.tests?.length) {
    config.suites[rule.file] = {
      failed: rule.tests,
    }
  } else {
    // Entire suite skipped
    config.rules.exclude.push(rule.file)
  }
}

module.exports = config
