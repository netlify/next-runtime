import { expandGlob } from 'https://deno.land/std/fs/mod.ts'
import { parse } from 'https://deno.land/x/xml/mod.ts'
import { escape } from 'https://deno.land/std@0.192.0/html/mod.ts'

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
  failed: 0,
  passed: 0,
}

const icons = {
  failed: '❌',
  passed: '✅',
}

const tag = Deno.args[1] ?? 'canary'

function junitToHTML(xmlData: { testsuites: TestSuites }) {
  if (!xmlData.testsuites) {
    return ''
  }
  let html = ``

  const testSuites = Array.isArray(xmlData.testsuites.testsuite)
    ? xmlData.testsuites.testsuite
    : [xmlData.testsuites.testsuite]

  for (const suite of testSuites) {
    const testCases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase]

    html += testCases
      .map((testCase) => {
        if ('skipped' in testCase) {
          return ''
        }
        const status = testCase.failure ? 'failed' : 'passed'

        testCount[status]++
        return `<a data-status="${escape(status)}" title="${icons[status]} ${escape(
          testCase['@name'],
        )}" href="https://github.com/vercel/next.js/tree/${tag}/${testCase['@file']}"></a>`
      })
      .join('')
  }

  return html
}

async function processJUnitFiles(directoryPath: string) {
  let markdown = `<div class="test-results">`
  for await (const file of expandGlob(`${directoryPath}/**/*.xml`)) {
    const xmlData = await parseXMLFile(file.path)
    markdown += junitToHTML(xmlData)
  }
  markdown += `</div>`
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

const total = testCount['passed'] + testCount['failed']

console.log(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Are we Next yet?</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>`)

console.log(`<h1>${((testCount['passed'] / total) * 100).toFixed(2)}% passing</h1>`)

console.log(
  `<p>${testCount['passed']} passed out of ${total} Next.js deploy tests. ${testCount['failed']} still to go</p>`,
)

console.log(details)

console.log(`</body></html>`)
