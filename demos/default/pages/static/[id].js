import Link from 'next/link'

const StaticWithID = (props) => (
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
      <br />
      But it has a dynamic URL parameter: /static/:id.
      <br />
      Try changing the ID. It will always render this page, no matter what you put.
      <br />
      I am not sure what this is useful for.
      <br />
      But it&apos;s a feature of NextJS, so... I&apos;m supporting it.
    </p>

    <hr />

    <Link href="/">Go back home</Link>
  </div>
)

export default StaticWithID
