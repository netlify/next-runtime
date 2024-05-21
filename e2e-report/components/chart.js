'use client'

import { Chart } from 'chart.js/auto'
import { useEffect } from 'react'

export const TestChart = ({ passed, failed, id }) => {
  useEffect(() => {
    const ctx = document?.getElementById(id)
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Passed', 'Failed'],
        datasets: [
          {
            label: '',
            data: [passed, failed],
            backgroundColor: ['#2ecc717d', '#F44336', '#FFEB3B'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    })
    Chart.defaults.plugins.tooltip.xAlign = 'left'
    return () => {
      chart.destroy()
    }
  }, [failed, id, passed])

  return (
    <>
      <div className="chart">
        <canvas id={id}></canvas>
      </div>
    </>
  )
}
