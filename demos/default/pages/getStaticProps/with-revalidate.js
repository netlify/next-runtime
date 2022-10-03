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

export async function getStaticProps(context) {
  const res = await fetch(`https://api.tvmaze.com/shows/71`)
  console.log(res)
  const data = await res.json()

  return {
    props: {
      show: data,
    },
    // ODB handler will use the minimum TTL=60s
    revalidate: 1,
  }
}

export default Show
