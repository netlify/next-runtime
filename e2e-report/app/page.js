/* eslint-disable @next/next/no-img-element */
import Image from 'next/image'
import Table from '@/components/table'
import ComponentSwitcher from '@/components/switcher'
import StatsRow from '@/components/stats'
import testData from '@/utils/data'
import CopyBadgeButton from '@/components/copy-badge'
import { badgeSettings } from '@/utils/consts'

export default function Home() {
  // User can switch between two test suite tables: one with all non-empty suites,
  // and another showing only suites with failed tests (and the failed cases in them)
  const tableComponents = {
    'All suites': <Table suites={testData.nonEmptySuites} />,
    'Failed tests only': <Table suites={testData.suitesWithFailures} />,
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
    <div className="flex w-full items-center gap-4 bg-primary text-base-100 p-2 md:p-4 justify-center md:justify-between">
      <span className="flex gap-4 items-center">
        <Image
          alt="netlify logo"
          src="/logo.svg"
          width={97}
          height={40}
          className="hidden md:block"
        />
        <span className="md:text-lg font-bold">Next.js E2E Tests on Netlify Runtime v5</span>
      </span>
      <span className="hidden md:flex gap-2 items-center">
        <a href="/" target="_blank">
          <img
            src="/badge"
            width={badgeSettings.displaySize.width}
            height={badgeSettings.displaySize.height}
            alt={badgeSettings.alt}
          />
        </a>
        <CopyBadgeButton />
      </span>
    </div>
  )
}
