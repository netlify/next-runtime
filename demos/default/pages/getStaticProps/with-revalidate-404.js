import Link from 'next/link'

const Show = ({ show }) => (
  <div>
    <p>
      This page uses getStaticProps() to pre-fetch a TV show, but will return a 404 if the current time ends in 0-4.
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

export async function getStaticProps(context) {
  const res = await fetch(`https://api.tvmaze.com/shows/71`)
  const data = await res.json()
  console.log(data)

  return {
    props: {
      show: data,
    },
    notFound: new Date().getMinutes() % 10 < 5,
    revalidate: 60,
  }
}

export default Show
