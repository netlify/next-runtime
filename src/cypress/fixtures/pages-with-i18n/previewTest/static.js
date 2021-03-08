import Link from 'next/link'

const StaticTest = ({ number }) => {
  return (
    <div>
      <p>
        This page uses getStaticProps() and is SSRed when in preview mode.
        <br />
        <br />
        By default, it shows the TV show by ID (as static HTML).
        <br />
        But when in preview mode, it shows person by ID instead (SSRed).
      </p>

      <hr />

      <h1>Number: {number}</h1>

      <Link href="/">
        <a>Go back home</a>
      </Link>
    </div>
  )
}

export const getStaticProps = async ({ preview }) => {
  let number

  // In preview mode, use odd number
  if (preview) {
    number = 3
  }
  // In normal mode, use even number
  else {
    number = 4
  }

  return {
    props: {
      number,
    },
  }
}

export default StaticTest
