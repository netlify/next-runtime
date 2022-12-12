import Link from 'next/link'

import styles from './index.module.css'
import '@reach/dialog/styles.css'
import { useState } from 'react'
import { Dialog } from '@reach/dialog'
import { VisuallyHidden } from '@reach/visually-hidden'
import variables from '../../style-sass-test/variables.module.scss'

// Missing: disabling javascript
function BuiltInCSSSupport() {
  return (
    <div>
      <h1>Built In CSS Support</h1>
      <Link href="https://nextjs.org/docs/basic-features/built-in-css-support">Read Docs</Link>

      <h2>CSS Modules</h2>
      <p>CSS Modules are an optional feature and are only enabled for files with the .module.css extension. </p>
      <p className={styles.error}>This is made with an imported css module</p>

      <h2>
        Import styles from <code>node_modules</code>
      </h2>
      <p>This page imports a node module&apos;s css file for the dialog below:</p>
      <ExampleDialog />

      <h2>Sass Support</h2>
      <p>✅ Sass variable imported, color: {variables.primaryColor || <code>Error. Something went wrong</code>}</p>

      <div data-testid="css-in-js">
        <h2>CSS-in-JS</h2>
        <p>
          NextJS bundles styled-jsx to provide support for isolated scoped CSS. The aim is to support &quot;shadow
          CSS&quot; similar to Web Components, which unfortunately do not support server-rendering and are JS-only.
        </p>
        <style jsx>{`
          p {
            color: white;
            font-weight: 500;
            margin: 20px;
          }
          div {
            background: orange;
          }
        `}</style>
        <p>This section should be differently styled compared to the others (i.e. orange background)</p>
        <style global jsx>{`
          body {
            background: lightgrey;
          }
        `}</style>
      </div>
    </div>
  )
}

export default BuiltInCSSSupport

function ExampleDialog() {
  const [showDialog, setShowDialog] = useState(false)
  const open = () => setShowDialog(true)
  const close = () => setShowDialog(false)

  return (
    <div>
      <button onClick={open}>Open Dialog</button>
      <Dialog isOpen={showDialog} onDismiss={close}>
        <button className="close-button" onClick={close}>
          <VisuallyHidden>Close</VisuallyHidden>
          <span aria-hidden>×</span>
        </button>
        <p>Hello there. I am a dialog</p>
      </Dialog>
    </div>
  )
}
