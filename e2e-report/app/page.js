import { SkippedTests } from '../components/filter-data.js'
import GroupedTests from '../components/grouped-tests.js'
import Hero from '../components/hero.js'
import testData from '../data/test-results.json'

export default function Home() {
  const { results, passed, failed, total, passRate, skipped, testDate, nextVersion } = testData
  const skippedTests = []
  results.forEach((suite) => {
    if (suite.skipped === true) {
      skippedTests.push(suite)
    }

    const { testCases } = suite
    testCases?.forEach((testCase) => {
      if (testCase.status === 'failed') {
        skippedTests.push(testCase)
      }
    })
  })

  return (
    <>
      <header className="hero">
        <Hero passed={passed} failed={failed} total={total} passRate={passRate} skipped={skipped} />
      </header>
      <div className="title">
        <h2>E2E Test Results</h2>
        <p>
          Next.js {nextVersion}
          <br />
          Last updated: {testDate}
        </p>
      </div>
      <div className="grid">
        <GroupedTests testData={results} />
        <SkippedTests testSuites={skippedTests} />
      </div>
    </>
  )
}
