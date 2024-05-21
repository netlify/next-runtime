'use client'

import { useState } from 'react'

import Down from '../public/down.svg'
import Up from '../public/up.svg'

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

export const SkippedTests = ({ testSuites }) => {
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
        <h4>Open Issues + Skipped Tests</h4>
        <p>Total: {testSuites.length}</p>
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
          {testSuites?.map((testCase, index) => {
            const { name, link, reason, file } = testCase
            return (
              <tr key={`${index}`}>
                <td>{file || name}</td>
                <td>
                  <p>{reason}</p>
                  {link && (
                    <button className="github">
                      <a href={link} target="_blank">
                        {' '}
                        Github Issue
                      </a>
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
