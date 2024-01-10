import { expandGlob } from 'https://deno.land/std/fs/mod.ts'
import { parse } from 'https://deno.land/x/xml/mod.ts'

interface TestCase {
  '@classname': string
  '@name': string
  '@time': number
  '@file': string
  failure?: string
}

interface TestSuite {
  '@name': string
  '@errors': number
  '@failures': number
  '@skipped': number
  '@timestamp': string
  '@time': number
  '@tests': number
  testcase: TestCase[]
}

interface TestSuites {
  '@name': string
  '@tests': number
  '@failures': number
  '@errors': number
  '@time': number
  testsuite: TestSuite[]
}

async function parseXMLFile(filePath: string): Promise<{ testsuites: TestSuites }> {
  const xmlContent = await Deno.readTextFile(filePath)
  return parse(xmlContent) as unknown as { testsuites: TestSuites }
}

const suites: Array<{
  name: string
  tests: number
  failures: number
  skipped: number
  time: number
}> = []

const testCount = {
  '❌': 0,
  '⏭️': 0,
  '✅': 0,
}

function junitToMarkdown(xmlData: { testsuites: TestSuites }) {
  if (!xmlData.testsuites) {
    return ''
  }
  let markdown = ``

  const testSuites = Array.isArray(xmlData.testsuites.testsuite)
    ? xmlData.testsuites.testsuite
    : [xmlData.testsuites.testsuite]

  for (const suite of testSuites) {
    const {
      '@tests': tests,
      '@failures': failures,
      '@skipped': skipped,
      '@name': name,
      '@time': time,
    } = suite

    suites.push({
      name,
      tests,
      failures,
      skipped,
      time,
    })

    const passed = tests - failures - skipped

    const testCases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase]

    const testCasesDetails = testCases
      .map((testCase) => {
        const status = testCase.failure ? '❌' : 'skipped' in testCase ? '⏭️' : '✅'

        testCount[status]++
        return `<li>${status} ${testCase['@name'].slice(name.length)} (${testCase['@time'].toFixed(
          2,
        )}s)</li>`
      })
      .join('')

    markdown += `| <details><summary>${name}</summary><ul>${testCasesDetails}</ul></details> | ✅ ${passed} | ❌ ${failures} | ⏭️ ${skipped} | ${Math.round(
      time,
    )}s |\n`
  }

  return markdown
}

async function processJUnitFiles(directoryPath: string) {
  let markdown = `| Suite | Passed | Failed | Skipped | Time |\n| ------- | ------ | ------ | ------- | ---- |\n`
  for await (const file of expandGlob(`${directoryPath}/**/*.xml`)) {
    const xmlData = await parseXMLFile(file.path)
    markdown += junitToMarkdown(xmlData)
  }
  return markdown
}

// Get the directory path from the command-line arguments
const directoryPath = Deno.args[0]

// Check if the directory path is provided
if (!directoryPath) {
  console.error('Please provide a directory path.')
  Deno.exit(1)
}

// Process the JUnit files in the provided directory
const details = await processJUnitFiles(directoryPath)

let passedSuites = 0
let failedSuites = 0
let skippedSuites = 0
let partialSuites = 0

suites.forEach(({ tests, failures, skipped }) => {
  const unskipped = tests - skipped
  const pass = unskipped - failures
  if (skipped === tests) {
    skippedSuites++
  } else if (failures === unskipped) {
    failedSuites++
  } else if (pass === unskipped) {
    passedSuites++
  } else {
    partialSuites++
  }
})

console.log('## Test results')
console.log(`|  | Suites | Tests |`)
console.log(`| --- | --- | --- |`)
console.log(`| ✅ Passed | ${passedSuites} | ${testCount['✅']} |`)
console.log(`| ❌ Failed | ${failedSuites} | ${testCount['❌']} |`)
console.log(`| ⏭️ Skipped | ${skippedSuites} | ${testCount['⏭️']} |`)
console.log(`| 🌗 Partial | ${partialSuites} | |`)
console.log(
  `| **Total** | ${passedSuites + failedSuites + skippedSuites + partialSuites} | ${
    testCount['✅'] + testCount['❌'] + testCount['⏭️']
  } |`,
)

console.log('## Test cases')

console.log(details)
