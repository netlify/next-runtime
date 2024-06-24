import Link from 'next/link'
import { GithubIcon } from './icons'

// Show test suites and non-passing cases per each
export default function Table({ suites }) {
  const countColumns = ['Pass', 'Fail', 'Known', 'Skip']

  return (
    <table className="table issues-table text-base w-full">
      <thead>
        <tr>
          <th className="p-2 md:p-4">Test suite name</th>
          {countColumns.map((col) => {
            return (
              <th className="md:w-16 p-0 md:p-2 text-center" key={col}>
                {col}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {suites.map((suite, idx) => {
          return <TestSuiteRow suite={suite} key={'r' + idx} idx={idx} />
        })}
      </tbody>
    </table>
  )
}

function TestSuiteRow({ suite, idx }) {
  const badgeClasses = 'badge font-bold rounded '
  return (
    <>
      <tr key={'tr-' + idx} className="text-sm md:text-base">
        <td className="p-2 md:p-4">
          <Link href={suite.file} className="text-sm md:text-base">
            {suite.name}
          </Link>
        </td>
        <td>{suite.passed}</td>
        <td>
          {suite.failedUnknown > 0 ? (
            <div className={badgeClasses + 'badge-error text-white'}>{suite.failedUnknown}</div>
          ) : (
            '0'
          )}
        </td>
        <td>
          {suite.failedKnown > 0 ? (
            <div className={badgeClasses + 'badge-warning'}>{suite.failedKnown}</div>
          ) : (
            '0'
          )}
        </td>
        <td>
          {suite.skipped > 0 ? (
            <div className={badgeClasses + 'badge-accent'}>{suite.skipped}</div>
          ) : (
            '0'
          )}
        </td>
      </tr>

      {suite.testCases
        .filter((t) => t.status != 'passed')
        .map((t) => {
          return <TestCaseRow key={suite.name + t.name} test={t} />
        })}
    </>
  )
}

const maxLength = 100

// Simple utility not meant to cover all types of texts/lengths/cases
function shorten(text) {
  if (!text || text.length <= maxLength) return text

  // Slice text in two at the first whitespace after the middle of the text
  const ellipsis = ' [....]'
  const midIdx = (maxLength - ellipsis.length) / 2
  const sliceInx = text.indexOf(' ', midIdx)
  const beforeSlice = text.slice(0, sliceInx) + ellipsis
  let afterSlice = text.slice(sliceInx)

  // As long the full text is too long, trim more full words
  while (beforeSlice.length + afterSlice.length > maxLength) {
    afterSlice = afterSlice.replace(/[^\s]+\s+/, '')
  }
  return beforeSlice + afterSlice
}

function TestCaseRow({ test }) {
  const fullName = test.name + (test.retries > 0 ? ` (${test.retries} retries)` : '')
  const displayName = shorten(fullName)
  const nameHasTooltip = displayName != fullName

  const displayReason = shorten(test.reason)
  const reasonHasTooltip = displayReason != test.reason

  function StatusBadge() {
    let badgeClasses = 'badge rounded '
    let label = ''

    if (test.status == 'failed') {
      label = 'Failed'
      badgeClasses += test.reason ? 'badge-warning' : 'badge-error text-white'
    } else {
      label = 'Skipped'
      badgeClasses += 'badge-accent'
    }

    return <div className={badgeClasses}>{label}</div>
  }

  function NameLine() {
    return (
      <div className="flex gap-2 items-center py-1">
        <StatusBadge />
        <div
          className={'opacity-90 text-sm md:text-base' + (nameHasTooltip ? ' tooltip' : '')}
          data-tip={nameHasTooltip ? fullName : undefined}
        >
          <span className="font-bold">Test:</span> {displayName}
        </div>
      </div>
    )
  }

  function ReasonLine() {
    return (
      <div
        className={
          'flex justify-start text-neutral font-bold opacity-90' +
          (reasonHasTooltip ? ' tooltip' : '')
        }
        data-tip={reasonHasTooltip ? test.reason : undefined}
      >
        {test.link ? (
          <Link
            href={test.link}
            target="_blank"
            className="flex gap-1 items-center text-sm md:text-base"
          >
            <GithubIcon className="w-4" />
            <span>{displayReason}</span>
          </Link>
        ) : (
          <span>{displayReason}</span>
        )}
      </div>
    )
  }

  return (
    <tr>
      <td colSpan={5} className="border bg-base-200/[.4] md:pl-6">
        <div className="flex flex-col gap-1 text-neutral text-left">
          <NameLine />
          {!!test.reason && <ReasonLine />}
        </div>
      </td>
    </tr>
  )
}
