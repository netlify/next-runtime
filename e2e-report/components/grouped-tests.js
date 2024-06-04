'use client'

import { useState } from 'react'

import Down from '../public/down.svg'
import Up from '../public/up.svg'

import { TestChart } from './chart.js'
import { groupTests } from './filter-data.js'
import Table from './table.js'
import TestSuites from './test-suites.js'

export default function GroupedTests({ testData }) {
  const testGroups = groupTests(testData)

  const [slider, setSlider] = useState({})
  function handleSelect(el) {
    setSlider({
      ...slider,
      [el]: !slider[el],
    })
  }

  const arrows = (dropdown) => {
    return dropdown ? (
      <Up className="arrow" width={200} height={150} />
    ) : (
      <Down className="arrow" width={200} height={150} />
    )
  }

  return (
    <>
      {testGroups.map((testGroup) => {
        const groupTotal = (testGroup.passed ?? 0) + (testGroup.failed ?? 0)
        return (
          <div key={testGroup.id} className="wrapper">
            <div className="card test-group" onClick={() => handleSelect(testGroup.id)}>
              <Table
                th={['Test suite type:', '# of suites:', '# of tests:', 'Passing:']}
                name={testGroup.title}
                suitesTotal={testGroup.results.length - testGroup.skipped}
                total={groupTotal}
                passed={testGroup.passed}
              />
              <TestChart id={testGroup.id} passed={testGroup.passed} failed={testGroup.failed} />
              {arrows(slider[testGroup.id])}
            </div>
            <div className={`testGroup ${slider[testGroup.id] ? 'open' : 'close'}`}>
              {testGroup.results
                .sort(
                  (aa, bb) =>
                    (bb.passed || 0) + (bb.failed || 0) - ((aa.passed || 0) + (aa.failed || 0)),
                )
                .map((suite, index) => {
                  return (
                    <div key={`${suite}${index}`} className="testSuite">
                      <TestSuites
                        suite={suite}
                        handleSelect={handleSelect}
                        slider={slider}
                        arrows={arrows}
                      />
                    </div>
                  )
                })}
            </div>
          </div>
        )
      })}
    </>
  )
}
