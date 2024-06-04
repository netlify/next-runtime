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
}

async function parseXMLFile(filePath: string): Promise<{ testsuites: JUnitTestSuites }> {
  const xmlContent = await Deno.readTextFile(filePath)
  return parse(xmlContent) as unknown as { testsuites: JUnitTestSuites }
}

const testCount = {
  failed: 0,
  skipped: 0,
  passed: 0,
}

function junitToJson(xmlData: {
  testsuites: JUnitTestSuites
}): Array<TestSuite | SkippedTestSuite> {
  if (!xmlData.testsuites) {
    return []
  }

  const testSuites = Array.isArray(xmlData.testsuites.testsuite)
    ? xmlData.testsuites.testsuite
    : [xmlData.testsuites.testsuite]

  return testSuites.map((suite) => {
    const { '@tests': tests, '@failures': failed, '@name': name } = suite

    const passed = tests - failed - suite['@skipped']

    const testCases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase]

    const testSuite: TestSuite = {
      name,
      file: testCases[0]?.['@file'],
      passed,
      failed: Number(failed),
      skipped: 0,
      total: tests,
      testCases: [],
    }
    const skippedTestsForFile = testConfig.skipped.find(
      (skippedTest) => skippedTest.file === testSuite.file,
    )

    // If the skipped file has no `tests`, all tests in the file are skipped
    testSuite.skipped =
      skippedTestsForFile != null ? (skippedTestsForFile.tests ?? testCases).length : 0

    for (const testCase of testCases) {
      if ('skipped' in testCase) {
        continue
      }
      const status = testCase.failure ? 'failed' : 'passed'
      testCount[status]++
      const test: TestCase = {
        name: testCase['@name'],
        status,
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

    if (skippedTestsForFile?.tests) {
      testCount.skipped += skippedTestsForFile.tests.length
      testSuite.testCases.push(
        ...skippedTestsForFile.tests.map((test): TestCase => {
          if (typeof test === 'string') {
            return {
              name: test,
              status: 'skipped',
              reason: skippedTestsForFile.reason,
            }
          }
          return {
            name: test.name,
            status: 'skipped',
            reason: test.reason,
          }
        }),
      )
    } else if (skippedTestsForFile != null) {
      // If `tests` is omitted, all tests in the file are skipped
      testCount.skipped += testSuite.total
    }
    return testSuite
  })
}

async function processJUnitFiles(
  directoryPath: string,
): Promise<Array<TestSuite | SkippedTestSuite>> {
  const results: (TestSuite | SkippedTestSuite)[] = []
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
  results.push(...skippedSuites)

  return results
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

const testResults = {
  ...testCount,
  total: testCount.passed + testCount.failed + testCount.skipped,
  passRate: ((testCount.passed / (testCount.passed + testCount.failed)) * 100).toFixed(2) + '%',
  testDate: new Date().toLocaleDateString(),
  nextVersion,
  results,
}

console.log(JSON.stringify(testResults, undefined, 2))
