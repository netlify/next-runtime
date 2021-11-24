import Link from 'next/link'

const Show = ({ show }) => (
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

export async function getStaticPaths() {
  // Set the paths we want to pre-render
  const paths = [{ params: { id: '1' } }, { params: { id: '2' } }]

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
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
