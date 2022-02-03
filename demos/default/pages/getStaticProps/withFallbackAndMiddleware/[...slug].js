import { useRouter } from 'next/router'
import Link from 'next/link'

const Show = ({ show }) => {
  const router = useRouter()

  // This is never shown on Netlify. We just need it for NextJS to be happy,
  // because NextJS will render a fallback HTML page.
  if (router.isFallback) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <p>
        Check the network panel for the header <code>x-middleware-date</code> to ensure that it is running
      </p>

      <hr />

      <h1>Show #{show.id}</h1>
      <p>{show.name}</p>

      <hr />

      <Link href="/">
        <a>Go back home</a>
      </Link>
    </div>
  )
}

export async function getStaticPaths() {
  // Set the paths we want to pre-render
  const paths = [{ params: { slug: ['my', 'path', '1'] } }, { params: { slug: ['my', 'path', '2'] } }]

  // We'll pre-render these paths at build time.
  // { fallback: true } means other routes will be rendered at runtime.
  return { paths, fallback: true }
}

export async function getStaticProps({ params }) {
  // The ID to render
  const { slug } = params
  const id = slug[slug.length - 1]

  const res = await fetch(`https://api.tvmaze.com/shows/${id}`)
  const data = await res.json()

  return {
    props: {
      show: data,
    },
  }
}

export default Show
