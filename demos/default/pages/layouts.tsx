import Link from 'next/link'
import { useEffect } from 'react'

function Layouts() {
  return (
    <div>
      <h1>Layout</h1>
      <Link href="https://nextjs.org/docs/basic-features/layouts#per-page-layouts">Read Docs</Link>
      <p>
        The React model allows us to deconstruct a page into a series of components. Many of these components are often
        reused between pages. For example, you might have the same navigation bar and footer on every page.
      </p>
      <p>
        This page should have an <code>span</code> tag that is added through a layout and the title should have changed
        in a <code>useEffect</code>
      </p>
    </div>
  )
}

Layouts.getLayout = function getLayout(page) {
  return <TestLayout>{page}</TestLayout>
}

function TestLayout({ children }) {
  useEffect(() => {
    // Update the document title using the browser API
    document.title = `Per Page Layout test title`
  })

  return (
    <div>
      <span>Test layout wrapper</span>
      {children}
    </div>
  )
}

export default Layouts
