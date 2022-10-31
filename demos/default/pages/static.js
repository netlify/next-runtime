import Link from 'next/link'

const Static = (props) => (
  <div>
    <p>
      This page does not use getInitialProps.
      <br />
      It is a static page.
      <br />
      It is never server-side rendered.
      <br />
      It is served directly by Netlify&apos;s CDN.
      <br />
      The <a href="https://www.npmjs.com/package/next-on-netlify">next-on-netlify</a> npm package takes care of deciding
      which pages to render server-side and which ones to serve directly via CDN.
    </p>

    <hr />

    <Link href="/">Go back home</Link>
  </div>
)

export default Static
