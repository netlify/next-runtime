import { OpenIssues, SkippedTests } from '../components/filter-data.js'
import GroupedTests from '../components/grouped-tests.js'
import Hero from '../components/hero.js'
import testData from '../data/test-results.json'

export default function Home() {
  const { results, passed, failed, total, passRate, skipped, testDate, nextVersion } = testData
  const skippedSuites = results.filter(({ skipped }) => skipped === true)
  const skippedTestCases = results.flatMap(
    ({ testCases }) => testCases?.filter(({ status }) => status === 'skipped') ?? [],
  )
  const failedTestCases = results.flatMap(
    ({ testCases }) => testCases?.filter(({ status }) => status === 'failed') ?? [],
  )

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
        <OpenIssues testCases={failedTestCases} />
        <SkippedTests testSuites={skippedSuites} testCases={skippedTestCases} />
      </div>
    </>
  )
}
