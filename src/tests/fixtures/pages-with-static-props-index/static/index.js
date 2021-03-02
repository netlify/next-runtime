import Link from 'next/link'

const Page = ({ now }) => (
  <div>
    <h1>Date.now(): {now}</h1>

    <Link href="/">
      <a>Index page</a>
    </Link>
  </div>
)

export async function getStaticProps(context) {
  return {
    props: {
      now: Date.now(),
    },
  }
}

export default Page
