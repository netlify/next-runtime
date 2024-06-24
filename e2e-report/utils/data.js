import fileData from '@/data/test-results.json'

const nonEmptySuites = fileData.results.filter((suite) => suite.testCases?.length > 0)
nonEmptySuites.forEach((suite) => {
  const actualFailed = suite.testCases?.filter((t) => t.status === 'failed') || []
  if (actualFailed.length !== suite.failed) {
    console.warn(
      `In suite "${suite.name}", failed value is ${suite.failed} but count of actual failed cases found is ${actualFailed.length}`,
    )
    suite.failed = actualFailed.length
  }

  suite.failedKnown = actualFailed.filter((t) => !!t.reason).length || 0
  suite.failedUnknown = suite.failed - suite.failedKnown
})

const suitesWithFailures = nonEmptySuites.filter((suite) => suite.failed > 0)
suitesWithFailures.forEach((suite) => {
  suite.testCases = suite.testCases.filter((t) => t.status === 'failed')
})

const allFailures = fileData.results
  .flatMap((suite) => {
    return suite.testCases?.filter((t) => t.status === 'failed')
  })
  .filter(Boolean)
const knownFailuresCount = allFailures.filter((t) => !!t.reason).length
const unknownFailuresCount = allFailures.length - knownFailuresCount

const testData = {
  passed: fileData.passed,
  failed: fileData.failed,
  skipped: fileData.skipped,
  nextVersion: fileData.nextVersion,
  testDate: fileData.testDate,
  nonEmptySuites,
  suitesWithFailures,
  knownFailuresCount,
  unknownFailuresCount,
}

export default testData
