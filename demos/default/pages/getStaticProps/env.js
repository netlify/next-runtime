import Link from 'next/link'

const Env = ({ env }) => (
  <div>
    <p>This page uses getStaticProps() to populate env vars.</p>

    <hr />
    <p>env: {env}</p>

    <Link href="/">Go back home</Link>
  </div>
)

export function getStaticProps(context) {
  return {
    props: {
      env: process.env.HELLO_WORLD || null,
    },
  }
}

export default Env
