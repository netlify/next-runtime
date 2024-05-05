import results from '../../report/test-results.json' with { type: 'json' }

let withReason = 0
let withoutReason = 0

for (const suite of results.results) {
  for (const testcase of suite.testCases ?? []) {
    if (testcase.status !== 'failed') {
      continue
    }

    if (testcase.reason) {
      withReason++
    } else {
      console.log(
        `${' '.repeat(90 - suite.file.length)}${suite.file.slice(9, -8)}:   ${testcase.name}`,
      )
      withoutReason++
    }
  }
}

console.log(`\n${withReason} tests have reasons, ${withoutReason} do not.`)
