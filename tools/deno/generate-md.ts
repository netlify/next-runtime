import results from '../../report/test-results.json' with { type: 'json' }

let withReason = 0
let withoutReason = 0

console.log('## Test results')
console.log(`|     | Tests |`)
console.log(`| --- | ----- |`)
console.log(`| ✅ Passed  | ${results.passed} |`)
console.log(`| ❌ Failed  | ${results.failed} |`)
console.log(`| ⏭️ Skipped | ${results.skipped.tests} tests + ${results.skipped.suites} suites |`)

console.log(`Pass rate: **${results.passRate}**`)
console.log('\n## Failures\n')

console.log(`| Test | Reason |`)
console.log(`| ---- | ------ |`)

for (const suite of results.results) {
  for (const testcase of suite.testCases ?? []) {
    if (testcase.status !== 'failed') {
      continue
    }
    console.log(
      `| [${testcase.name}](https://github.com/vercel/next.js/tree/canary/${suite.file}) | ${testcase.reason ? `[${testcase.reason}](${testcase.link})` : '❓'} |`,
    )
    if (testcase.reason) {
      withReason++
    } else {
      withoutReason++
    }
  }
}

console.log(`\n${withReason} tests have reasons, ${withoutReason} do not.`)
