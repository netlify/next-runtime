'use client'

import { useState } from 'react'

import Down from '../public/down.svg'
import Up from '../public/up.svg'
import ExternalLinkIcon from '../public/arrow-up-right-from-square-solid.svg'

export const groupDefinitions = [
  {
    id: 'app-dir',
    title: 'App dir',
    testFileMatcher: (file) => file?.startsWith(`test/e2e/app-dir`),
  },
  {
    id: 'middleware',
    title: 'Middleware',
    testFileMatcher: (file) => file?.startsWith(`test/e2e/middleware`),
  },
  {
    id: 'i18n',
    title: 'i18n',
    testFileMatcher: (file) => file?.startsWith(`test/e2e/i18n`),
  },

  {
    id: 'edge',
    title: 'Edge runtime',
    testFileMatcher: (file) => file?.startsWith(`test/e2e/edge`),
  },
  {
    id: 'misc',
    title: 'Other test suites',
    // this will match everything that doesn't match the other groups, so it has to be last entry
    testFileMatcher: () => true,
  },
]

export const groupTests = (testSuites) => {
  // TODO: most likely not the best way to group these tests but will leave for now
  return testSuites.reduce(
    (acc, suite) => {
      const { file, passed, failed, skipped } = suite
      for (const group of acc) {
        if (group.testFileMatcher(file)) {
          group.results.push(suite)
          group.passed += passed || 0
          group.failed += failed || 0
          group.skipped += skipped || 0
          break
        }
      }

      return acc
    },
    groupDefinitions.map((group) => {
      return { ...group, results: [], passed: 0, failed: 0, skipped: 0 }
    }),
  )
}

export const OpenIssues = ({ testCases }) => {
  const [slider, setSlider] = useState({})

  function handleSelect(el) {
    setSlider({
      ...slider,
      [el]: !slider[el],
    })
  }

  return (
    <div className="wrapper">
      <div className="card" onClick={() => handleSelect('openIssues')}>
        <h4>Open Issues</h4>
        <p>Total: {testCases.length}</p>
        {slider.openIssues ? (
          <Up className="arrow" width={200} height={150} />
        ) : (
          <Down className="arrow" width={200} height={150} />
        )}
      </div>
      <table className={`testSuite card open-issues ${slider.openIssues ? 'open' : 'close'}`}>
        <tbody>
          <tr>
            <th>Test</th>
            <th>Reason</th>
          </tr>
          {testCases.map((testCase, index) => {
            const { name, link, reason = 'Reason not yet assigned', retries } = testCase
            return (
              <tr key={index}>
                <td>
                  {name}
                  {retries > 0 ? ` (🔁 retries: ${retries})` : null}
                </td>
                <td>
                  <p>
                    {link ? (
                      <a href={link} target="_blank">
                        <ExternalLinkIcon className="github-link-icon" />
                        {reason}
                      </a>
                    ) : (
                      reason
                    )}
                  </p>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const SkippedTests = ({ testCases, testSuites }) => {
  const [slider, setSlider] = useState({})

  function handleSelect(el) {
    setSlider({
      ...slider,
      [`${el}`]: !slider[el],
    })
  }

  return (
    <div className="wrapper">
      <div className="card" onClick={() => handleSelect('skipped')}>
        <h4>Skipped Tests</h4>
        <p>
          Total: {testSuites.length} suites + {testCases.length} tests
        </p>
        {slider.skipped ? (
          <Up className="arrow" width={200} height={150} />
        ) : (
          <Down className="arrow" width={200} height={150} />
        )}
      </div>
      <table className={`testSuite card skipped ${slider.skipped ? 'open' : 'close'}`}>
        <tbody>
          <tr>
            <th>Test</th>
            <th>Reason</th>
          </tr>
          {testSuites.map((testCase, index) => {
            const { file, reason } = testCase
            return (
              <tr key={index}>
                <td>{file}</td>
                <td>
                  <p>{reason}</p>
                </td>
              </tr>
            )
          })}
          {testCases.map((testCase, index) => {
            const { name, reason } = testCase
            return (
              <tr key={index}>
                <td>{name}</td>
                <td>
                  <p>{reason}</p>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
