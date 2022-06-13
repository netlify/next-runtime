import { useRouter } from 'next/router'
import Link from 'next/link'

const Show = ({ show, time }) => (
  <div>
    <p>This page uses getStaticProps() to pre-fetch a TV show.</p>
    <p>Ids 1 and 2 are prerendered and others should render on-demand.</p>
    <hr />

    <h1>Show #{show.id}</h1>
    <p>{show.name}</p>
    <p>Rendered at {time} </p>
    <hr />

    <Link href="/">
      <a>Go back home</a>
    </Link>
  </div>
)

export async function getStaticPaths() {
  // Set the paths we want to pre-render
  const paths = [{ params: { id: '1' } }, { params: { id: '2' } }]

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
  const time = new Date().toLocaleTimeString()

  return {
    props: {
      show: data,
      time,
    },
  }
}

export default Show
