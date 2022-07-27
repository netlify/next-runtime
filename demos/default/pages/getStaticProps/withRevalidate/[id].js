import Link from 'next/link'

const Show = ({ show, time }) => (
  <div>
    <p>This page uses getStaticProps() to pre-fetch a TV show.</p>
    <p>Ids 1 and 2 are prerendered and others should 404.</p>
    <p>The page should be revalidated after 60 seconds.</p>
    <hr />

    <h1>Show #{show.id}</h1>
    <p>{show.name}</p>
    <p>Rendered at {time} (slowly)</p>
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
  const time = new Date().toLocaleTimeString()

  return {
    props: {
      show: data,
      time,
    },
    revalidate: 60,
  }
}

export default Show
