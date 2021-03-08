import Link from 'next/link'

const Show = ({ show }) => (
  <div>
    <p>
      This page uses getInitialProps() to fetch the show with the ID provided in the URL: /shows/:id
      <br />
      Refresh the page to see server-side rendering in action.
      <br />
      You can also try changing the ID to any other number between 1-10000.
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

export const getServerSideProps = async ({ params }) => {
  const res = await fetch('https://api.tvmaze.com/shows/42')
  const data = await res.json()

  return {
    props: {
      show: data,
    },
  }
}

export default Show
