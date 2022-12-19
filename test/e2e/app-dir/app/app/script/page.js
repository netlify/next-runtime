import Script from 'next/script'

import Client from './client'

export default function Page() {
  return (
    <div>
      <h2>next/script</h2>
      <Client />
      <Script strategy="lazyOnload" src="/test4.js" />
      <Script strategy="afterInteractive" src="/test3.js" />
      <Script strategy="beforeInteractive" src="/test1.js" />
      <Script strategy="beforeInteractive" id="1.5">{`
        ;(window._script_order = window._script_order || []).push(1.5)
        console.log(window._script_order)
      `}</Script>
      <Script strategy="beforeInteractive" src="/test2.js" />
      <Script
        strategy="beforeInteractive"
        id="2.5"
        dangerouslySetInnerHTML={{
          __html: `
        ;(window._script_order = window._script_order || []).push(2.5)
        console.log(window._script_order)
        `,
        }}
      />
    </div>
  )
}
