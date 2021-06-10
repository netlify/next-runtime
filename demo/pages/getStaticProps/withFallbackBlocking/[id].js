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
      <p>This page uses getStaticProps() to pre-fetch a TV show.</p>

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
  const paths = [{ params: { id: '3' } }, { params: { id: '4' } }]

  // We'll pre-render these paths at build time.
  // { fallback: blocking } means routes will be built when visited for the
  // first time and only after it's built will the client receive a response
  return { paths, fallback: 'blocking' }
}

export async function getStaticProps({ params }) {
  // The ID to render
  const { id } = params

  const res = await fetch(`https://api.tvmaze.com/shows/${id}`)
  const data = await res.json()

  return {
    props: {
      show: data,
    },
  }
}

export default Show
