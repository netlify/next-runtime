import { InfoIcon, ErrorIcon, NaIcon } from '@/components/icons'

export default function StatsRow({ testData }) {
  const testsRun = testData.passed + testData.failed
  const passRate = ((testData.passed / testsRun) * 100).toFixed(1)

  return (
    <div className="stats stats-vertical lg:stats-horizontal border-b rounded w-full">
      <div className="stat">
        <div className="stat-title">Next.js version</div>
        <div className="stat-value">{testData.nextVersion}</div>
        <div className="stat-desc">run date: {testData.testDate}</div>
      </div>

      <div className="stat">
        <div className="stat-title">Tests Run</div>
        <div className="stat-value">{testsRun.toLocaleString()}</div>
        <div className="stat-desc">exc. skipped tests</div>
      </div>

      <div className="stat">
        <div className="stat-title">Passing Tests</div>
        <div className="stat-value flex gap-1 items-baseline">
          <span>{testData.passed.toLocaleString()}</span>
          <span className="text-2xl opacity-90">({passRate}%)</span>
        </div>
        <div className="stat-desc">of all tests run</div>
      </div>

      <div className="stat">
        <div className="stat-title">Known Failures</div>
        <div className="stat-value flex gap-1 items-center">
          <div className="size-6">
            <InfoIcon />
          </div>
          <span>{testData.knownFailuresCount}</span>
        </div>
        <div className="stat-desc">mapped to GitHub issues</div>
      </div>

      <div className="stat">
        <div className="stat-title">Unknown Failures</div>
        <div className="stat-value flex gap-1 items-center">
          <div className="size-6">
            <ErrorIcon />
          </div>
          <span>{testData.unknownFailuresCount}</span>
        </div>
        <div className="stat-desc">not mapped to issues</div>
      </div>

      <div className="stat">
        <div className="stat-title">Skipped</div>
        <div className="stat-value"></div>
        <div className="stat-value flex gap-1 items-center">
          <div className="size-6">
            <NaIcon />
          </div>
          <span>{testData.skipped.tests.toLocaleString()}</span>
        </div>
        <div className="stat-desc">using proprietary tools</div>
      </div>
    </div>
  )
}
