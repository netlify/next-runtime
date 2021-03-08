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
      It is served directly by Netlify's CDN.
      <br />
      <br />
      But it has a dynamic URL parameter: /static/:id.
      <br />
      Try changing the ID. It will always render this page, no matter what you put.
      <br />
      I am not sure what this is useful for.
      <br />
      But it's a feature of NextJS, so... I'm supporting it.
    </p>

    <hr />

    <Link href="/">
      <a>Go back home</a>
    </Link>
  </div>
)

export default StaticWithID
