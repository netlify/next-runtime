import Table from './table.js'

export default function TestSuites({ suite, slider, handleSelect, arrows }) {
  const { name, file, passed, failed, testCases } = suite

  return (
    <>
      <div onClick={() => handleSelect(name)} className="card">
        <Table
          th={['Test suite:', '# of tests:', 'Passing:']}
          name={name}
          passed={passed}
          total={passed + failed}
        />
        {arrows(slider[name])}
      </div>
      <ul className={`testCases ${slider[name] ? 'open' : 'close'}`}>
        {testCases?.map((testCase, index) => {
          const { status, link, reason } = testCase

          if (status === 'skipped') {
            return
          }

          return (
            <li key={`${name}${index}`}>
              <a target="_blank" href={`https://github.com/vercel/next.js/tree/canary/${file}`}>
                {testCase.name}
              </a>
              <span className="status" data-status={status}></span>
              {reason && <p>Reason: {reason}</p>}
              {link && (
                <button className="github">
                  <a href={link} target="_blank">
                    {' '}
                    Github Issue
                  </a>
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
