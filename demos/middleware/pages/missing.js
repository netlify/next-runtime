import * as React from 'react'
import Link from 'next/link'

const Missing = () => {
  return (
    <div>
      <p>Will Check if 'missingCookie' is missing and display headers</p>
      <p>To test go to <Link href="/matcher-cookie">cookies page</Link> and come back</p>
    </div>
  )
}

export default Missing
