import Link from 'next/link'

const Show = () => (
  <div>
    <p>This page is ISR, but will return a 404 if the current time ends in 0-4.</p>

    <Link href="/">Go back home</Link>
  </div>
)

export async function getStaticProps(context) {
  return {
    props: {},
    notFound: new Date().getMinutes() % 10 < 5,
    revalidate: 60,
  }
}

export default Show
