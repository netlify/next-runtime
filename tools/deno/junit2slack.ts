import { expandGlob } from 'https://deno.land/std/fs/mod.ts'
import { parse } from 'https://deno.land/x/xml/mod.ts'
import { parseArgs } from 'https://deno.land/std@0.218.2/cli/parse_args.ts'
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

const testCount = {
  failed: 0,
  passed: 0,
  skipped: 0,
}

const squares: Array<string> = []

const icons = {
  failed: '🟥',
  passed: '🟩',
  skipped: '⬜',
}

function parseJUnit(xmlData: { testsuites: TestSuites }) {
  if (!xmlData.testsuites) {
    return
  }

  const testSuites = Array.isArray(xmlData.testsuites.testsuite)
    ? xmlData.testsuites.testsuite
    : [xmlData.testsuites.testsuite]

  for (const suite of testSuites) {
    const testCases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase]

    testCases.forEach((testCase) => {
      const status = 'skipped' in testCase ? 'skipped' : testCase.failure ? 'failed' : 'passed'
      testCount[status]++
      squares.push(icons[status])
    })
  }
}

async function processJUnitFiles(directoryPath: string) {
  for await (const file of expandGlob(`${directoryPath}/**/*.xml`)) {
    const xmlData = await parseXMLFile(file.path)
    parseJUnit(xmlData)
  }
}

const { dir, version, runUrl } = parseArgs(Deno.args)

// Check if the directory path is provided
if (!dir) {
  console.error('Please provide a directory path.')
  Deno.exit(1)
}

// Process the JUnit files in the provided directory
await processJUnitFiles(dir)

const total = testCount['passed'] + testCount['failed']
let data = ''
data += `*Passed:* ${testCount['passed']} \n`
data += `*Failed:* ${testCount['failed']} \n`
data += `*Skipped:* ${testCount['skipped']}\n\n`

data += `*${((testCount['passed'] / total) * 100).toFixed(2)}%* passing\n`

data += `*${testCount['passed']}* passed out of *${total}* Next.js deploy tests. *${testCount['failed']}* still to go.\n\n`

const result: { blocks: Array<Record<string, unknown>> } = {
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `E2E test results for Next.js ${version}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: data,
      },
      accessory: {
        type: 'image',
        image_url:
          'https://emoji.slack-edge.com/T02UKDKNA/old-man-yells-at-vercel/3927e24cc7b0fa8d.png',
        alt_text: 'old man yells at Next.js',
      },
    },
  ],
}

if (runUrl) {
  result.blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: ':github:  Show details',
          emoji: true,
        },
        url: runUrl,
      },
    ],
  })
}

console.log(JSON.stringify(result))
