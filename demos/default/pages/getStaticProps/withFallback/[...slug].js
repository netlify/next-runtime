import { useRouter } from 'next/router'
import Link from 'next/link'

const Show = ({ show, time }) => {
  const router = useRouter()

  if (router.isFallback) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <p>This page uses getStaticProps() to pre-fetch a TV show.</p>
      <p>
        Paths /my/path/1 and /my/path/2 are prerendered and any other path should show a{' '}
        <a href="https://nextjs.org/docs/api-reference/data-fetching/get-static-paths#fallback-true">fallback page</a>{' '}
        while rendering.
      </p>
      <hr />

      <h1>Show #{show.id}</h1>
      <p>{show.name}</p>
      <p>Rendered at {time} </p>
      <hr />

      <Link href="/">Go back home</Link>
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

  const res = await fetch(`https://tvproxy.netlify.app/shows/${Number(id)}`)
  const data = await res.json()
  const time = new Date().toLocaleTimeString()

  return {
    props: {
      show: data,
      time,
    },
  }
}

export default Show
