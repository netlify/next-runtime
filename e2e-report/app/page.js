import Image from 'next/image'
import Table from '@/components/table'
import ComponentSwitcher from '@/components/switcher'
import StatsRow from '@/components/stats'
import testData from '@/utils/data'

export default function Home() {
  // User can switch between two test suite tables: one with all non-empty suites,
  // and another showing only suites with failed tests (and the failed cases in them)
  const tableComponents = {
    'All suites': <Table suites={testData.nonEmptySuites} />,
    'Failed tests only': <Table suites={testData.suitesWithIssues} />,
  }

  return (
    <div className="flex flex-col w-full items-center font-primary overflow-x-hidden">
      <Header />
      <StatsRow testData={testData} />
      <div className="max-w-5xl w-full py-4 px-0 md:p-8">
        <ComponentSwitcher components={tableComponents} />
      </div>
    </div>
  )
}

function Header() {
  return (
    <div className="flex w-full items-center gap-4 bg-primary text-base-100 p-2 md:p-4 justify-center">
      <Image
        alt="netlify logo"
        src="/logo.svg"
        width={97}
        height={40}
        className="hidden md:block"
      />
      <span className="md:text-lg font-bold uppercase">
        Next.js E2E Tests on Netlify Runtime v5
      </span>
    </div>
  )
}
