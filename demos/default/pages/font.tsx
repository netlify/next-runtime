import Head from 'next/head'
import Link from 'next/link'

function Font() {
  return (
    <div>
      {/* <Head> */}
      <link href="https://fonts.googleapis.com/css2?family=Inter&display=optional" rel="stylesheet" />
      {/* </Head> */}
      <h1>Font Optimization</h1>
      <Link href="https://nextjs.org/docs/basic-features/font-optimization">Read Docs</Link>
      <p>
        By default, Next.js will automatically inline font CSS at build time, eliminating an extra round trip to fetch
        font declarations.
      </p>
      <p>
        If optimized font is enabled (default), it should show <code>style</code>, otherwise it should show{' '}
        <code>link</code> in the head
      </p>
    </div>
  )
}

export default Font
