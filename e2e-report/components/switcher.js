'use client'
import { useState } from 'react'

// Given a map of labels->components, create a toggle button group to allow switching
// between these components. This is a stateful client component, but can receive server components.
export default function ComponentSwitcher({ components, defaultLabel }) {
  const labels = Object.keys(components)
  const [selectedLabel, setSelectedLabel] = useState(defaultLabel || labels[0])
  const currComponent = components[selectedLabel]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center md:justify-end">
        <ToggleButtonGroup
          labels={labels}
          selectedLabel={selectedLabel}
          setSelectedLabel={setSelectedLabel}
        />
      </div>
      {currComponent}
    </div>
  )
}

function ToggleButtonGroup({ labels, selectedLabel, setSelectedLabel }) {
  return (
    <div className="join">
      {labels.map((label) => {
        return (
          <input
            className="join-item btn text-base md:btn-sm rounded"
            name="optionsGroup"
            key={label}
            type="radio"
            aria-label={label}
            checked={label === selectedLabel}
            onChange={() => {
              setSelectedLabel(label)
            }}
          />
        )
      })}
    </div>
  )
}
