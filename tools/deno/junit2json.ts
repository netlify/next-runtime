import { expandGlob } from 'https://deno.land/std/fs/mod.ts'
import { parse } from 'https://deno.land/x/xml/mod.ts'

import testConfig from '../../tests/test-config.json' with { type: 'json' }

interface JUnitTestCase {
  '@classname': string
  '@name': string
  '@time': number
  '@file': string
  failure?: string
}

interface JUnitTestSuite {
  '@name': string
  '@errors': number
  '@failures': number
  '@skipped': number
  '@timestamp': string
  '@time': number
  '@tests': number
  testcase: JUnitTestCase[]
}

interface JUnitTestSuites {
  '@name': string
  '@tests': number
  '@failures': number
  '@errors': number
  '@time': number
  testsuite: JUnitTestSuite[]
}

interface TestSuite {
  name: string
  file: string
  passed: number
  failed: number
  skipped: number
  total: number
  testCases: TestCase[]
  retries: number
}

interface SkippedTestSuite {
  file: string
  /** reason is required either on the suite or on all tests */
  reason?: string
  skipped: true
}

interface TestCase {
  name: string
  status: 'passed' | 'failed' | 'skipped'
  reason?: string
  link?: string
  retries: number
}

async function parseXMLFile(filePath: string): Promise<{ testsuites: JUnitTestSuites }> {
  const xmlContent = await Deno.readTextFile(filePath)
  return parse(xmlContent) as unknown as { testsuites: JUnitTestSuites }
}

function junitToJson(xmlData: { testsuites: JUnitTestSuites }): Array<TestSuite> {
  if (!xmlData.testsuites) {
    return []
  }

  const testSuites = Array.isArray(xmlData.testsuites.testsuite)
    ? xmlData.testsuites.testsuite
    : [xmlData.testsuites.testsuite]

  return testSuites.map((suite) => {
    const total = Number(suite['@tests'])
    const failed = Number(suite['@failures']) + Number(suite['@errors'])
    const name = suite['@name']
    const testCases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase]

    const passed = total - failed - suite['@skipped']
    const testSuite: TestSuite = {
      name,
      file: testCases[0]?.['@file'],
      passed,
      failed,
      // The XML file contains a count of "skipped" tests, but we actually want to report on what WE
      // want to "skip" (i.e. the tests that are marked as skipped in `test-config.json`). This is
      // confusing and we should probably use a different term for our concept.
      skipped: 0,
      total,
      testCases: [],
      // This is computed below by detecting duplicates
      retries: 0,
    }
    const skipConfigForFile = testConfig.skipped.find(
      (skippedTest) => skippedTest.file === testSuite.file,
    )
    const isEntireSuiteSkipped = skipConfigForFile != null && skipConfigForFile.tests == null
    const skippedTestsForFile =
      skipConfigForFile?.tests?.map((skippedTest) => {
        // The config supports both a bare string and an object
        if (typeof skippedTest === 'string') {
          return { name: skippedTest, reason: skipConfigForFile.reason ?? null }
        }
        return skippedTest
      }) ?? []

    // If the skipped file has no `tests`, all tests in the file are skipped
    testSuite.skipped = isEntireSuiteSkipped ? testCases.length : skippedTestsForFile.length

    for (const testCase of testCases) {
      // Omit tests skipped in the Next.js repo itself
      if ('skipped' in testCase) {
        continue
      }
      // Omit tests we've marked as "skipped" in `test-config.json`
      if (skippedTestsForFile?.some(({ name }) => name === testCase['@name'])) {
        continue
      }

      // skip reporting on tests that even fail to deploy because they rely on experiments not available
      // in currently tested version
      if (testCase.failure?.includes('CanaryOnlyError')) {
        continue
      }

      const status = testCase.failure ? 'failed' : 'passed'
      const test: TestCase = {
        name: testCase['@name'],
        status,
        retries: 0,
      }
      if (status === 'failed') {
        const failure = testConfig.failures.find(
          (conf) => conf.name === test.name || conf.name === testSuite.file,
        )
        if (failure) {
          test.reason = failure.reason
          test.link = failure.link
        }
      }
      testSuite.testCases.push(test)
    }

    if (!isEntireSuiteSkipped && skippedTestsForFile.length > 0) {
      testSuite.testCases.push(
        ...skippedTestsForFile.map(
          (test): TestCase => ({
            name: test.name,
            status: 'skipped',
            reason: test.reason,
            retries: 0,
          }),
        ),
      )
    }

    return testSuite
  })
}

function mergeTestResults(result1: TestSuite, result2: TestSuite): TestSuite {
  if (result1.file !== result2.file) {
    throw new Error('Cannot merge results for different files')
  }
  if (result1.name !== result2.name) {
    throw new Error('Cannot merge results for different suites')
  }
  if (result1.total !== result2.total) {
    throw new Error('Cannot merge results with different total test counts')
  }

  // Return the run result with the fewest failures.
  // We could merge at the individual test level across runs, but then we'd need to re-calculate
  // all the total counts, and that probably isn't worth the complexity.
  const bestResult = result1.failed < result2.failed ? result1 : result2
  const retries = result1.retries + result2.retries + 1
  return {
    ...bestResult,
    retries,
    ...(bestResult.testCases == null
      ? {}
      : {
          testCases: bestResult.testCases.map((testCase) => ({
            ...testCase,
            retries,
          })),
        }),
  }
}

// When a test is run multiple times (due to retries), the test runner outputs a separate entry
// for each run. Merge them into a single entry.
function dedupeTestResults(results: Array<TestSuite>): Array<TestSuite> {
  // For some reason, with some older versions of next.js (e.g. 13.5.1) the `file` field is not
  // present in the XML output. Since `name` is not reliable as a unique identifier, we have no
  // choice but to skip deduping in this case.
  // TODO(serhalp) Change this to throw when we stop testing against 13.5.1.
  const allResultsHaveFile = results.every((result) => result.file != null)
  if (!allResultsHaveFile) {
    console.warn(
      'Skipping deduping of test results because some results are missing the `file` field',
    )
    return results
  }

  const resultsByFile = new Map<string, TestSuite>()
  for (const result of results) {
    const existingResult = resultsByFile.get(result.file)
    if (existingResult == null) {
      resultsByFile.set(result.file, result)
    } else {
      resultsByFile.set(result.file, mergeTestResults(existingResult, result))
    }
  }
  return [...resultsByFile.values()]
}

async function processJUnitFiles(
  directoryPath: string,
): Promise<Array<TestSuite | SkippedTestSuite>> {
  const results: TestSuite[] = []
  for await (const file of expandGlob(`${directoryPath}/**/*.xml`)) {
    const xmlData = await parseXMLFile(file.path)
    results.push(...junitToJson(xmlData))
  }

  // We've configured the Next.js e2e test runner to *actually* skip entire test
  // suites that are marked as skipped in `test-config.json`, so this appends those
  // to the results (but NOT partially skipped suites, as these are already included).
  const skippedSuites = testConfig.skipped
    .filter(({ tests }) => tests == null)
    .map(
      ({ file, reason }): SkippedTestSuite => ({
        file,
        reason,
        skipped: true,
      }),
    )

  return [...dedupeTestResults(results), ...skippedSuites]
}

function summarizeResults(results: Array<TestSuite | SkippedTestSuite>): {
  passed: number
  failed: number
  skippedSuites: number
  skippedTests: number
} {
  return {
    passed: results.reduce(
      (acc, result) =>
        acc +
        (result.skipped === true
          ? 0
          : result.testCases.reduce(
              (acc, testCase) => acc + (testCase.status === 'passed' ? 1 : 0),
              0,
            )),
      0,
    ),
    failed: results.reduce(
      (acc, result) =>
        acc +
        (result.skipped === true
          ? 0
          : result.testCases.reduce(
              (acc, testCase) => acc + (testCase.status === 'failed' ? 1 : 0),
              0,
            )),
      0,
    ),
    skippedSuites: results.filter((result) => result.skipped === true).length,
    skippedTests: results.reduce(
      (acc, result) =>
        acc +
        (result.skipped === true
          ? 0
          : result.testCases.reduce(
              (acc, testCase) => acc + (testCase.status === 'skipped' ? 1 : 0),
              0,
            )),
      0,
    ),
  }
}

// Get the directory path from the command-line arguments
const directoryPath = Deno.args[0]

const nextVersion = Deno.args[1]

// Check if the directory path is provided
if (!directoryPath) {
  console.error('Please provide a directory path.')
  Deno.exit(1)
}

// Process the JUnit files in the provided directory
const results = await processJUnitFiles(directoryPath)

const { passed, failed, skippedSuites, skippedTests } = summarizeResults(results)
const testResults = {
  failed,
  skipped: {
    suites: skippedSuites,
    tests: skippedTests,
  },
  passed,
  passRate: ((passed / (passed + failed)) * 100).toFixed(2) + '%',
  testDate: new Date().toLocaleDateString(),
  nextVersion,
  results,
}

console.log(JSON.stringify(testResults, undefined, 2))
