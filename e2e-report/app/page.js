import Image from 'next/image'
import Table from '@/components/table'
import ComponentSwitcher from '@/components/switcher'
import StatsRow from '@/components/stats'

import testData from '@/data/test-results.json'

export default function Home() {
  const tableComponents = createTableComponents(testData)

  return (
    <div className="flex flex-col w-full items-center font-primary">
      <Header />
      <StatsRow testData={testData} />
      <div className="max-w-5xl w-full p-8">
        <ComponentSwitcher components={tableComponents} />
      </div>
    </div>
  )
}

// User can switch between two test suite tables: one with all non-empty suites,
// and another showing only suites with failed tests (and the failed cases in them)
function createTableComponents(testData) {
  testData.results.forEach((suite) => {
    suite.failedKnown =
      suite.testCases?.filter((t) => t.status === 'failed' && t.reason).length || 0
    suite.failedUnknown = suite.failed - suite.failedKnown
  })
  const nonEmptySuites = testData.results.filter((suite) => suite.testCases?.length > 0)
  const suitesWithIssues = nonEmptySuites.filter((suite) => suite.failed > 0)
  suitesWithIssues.forEach((suite) => {
    suite.testCases = suite.testCases.filter((t) => t.status === 'failed')
  })

  return {
    'All suites': <Table suites={nonEmptySuites} />,
    'Failed tests only': <Table suites={suitesWithIssues} />,
  }
}

function Header() {
  return (
    <div className="flex w-full items-center gap-4 bg-primary text-base-100 p-4">
      <Image alt="netlify logo" src="/logo.svg" width={97} height={40} />
      <span className="text-lg font-bold uppercase">Next.js E2E Tests on Netlify Runtime v5</span>
    </div>
  )
}
