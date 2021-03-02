import Error from 'next/error'
import Link from 'next/link'

const Show = (props) => {
  const { errorCode, show } = props
  // If show item was not found, render 404 page
  if (errorCode) {
    return <Error statusCode={errorCode} />
  }

  // Otherwise, render show
  return (
    <div>
      <h1>Show #{show.id}</h1>
      <p>{show.name}</p>

      <hr />

      <Link href="/home">
        <a>Go back home to base page</a>
      </Link>
    </div>
  )
}

export const getServerSideProps = async ({ params }) => {
  // The ID to render
  const { bar } = params

  const res = await fetch(`https://api.tvmaze.com/shows/${bar}`)
  const data = await res.json()

  // Set error code if show item could not be found
  const errorCode = res.status > 200 ? res.status : false

  return {
    props: {
      errorCode,
      show: data,
    },
  }
}

export default Show
