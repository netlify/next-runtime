import Error from 'next/error'
import Link from 'next/link'

const CatchAll = ({ errorCode, show, params }) => {
  // If show item was not found, render 404 page
  if (errorCode) {
    return <Error statusCode={errorCode} />
  }

  // Otherwise, render show
  return (
    <div>
      <p>
        This is a server-side rendered catch-all page. It catches all requests made to
        /shows/:id/any/path/can/go/here... and makes those parameters available in getInitialProps():
        <br />
        {params.map((param, index) => (
          <span key={index}>
            [{index}]: {param}
            <br />
          </span>
        ))}
        <br />
        Refresh the page to see server-side rendering in action.
        <br />
        You can also try changing the URL to something random, such as /shows/
        {show.id}/whatever/path/you/want
      </p>

      <hr />

      <h1>Show #{show.id}</h1>
      <p>{show.name}</p>

      <hr />

      <Link href="/">Go back home</Link>
    </div>
  )
}

CatchAll.getInitialProps = async ({ res: req, query }) => {
  // Get the params to render
  const { params } = query

  // Get the ID to render
  const id = params[0]

  // Get the data
  const res = await fetch(`https://tvproxy.netlify.app/shows/${Number(id)}`)
  const data = await res.json()

  // Set error code if show item could not be found
  const errorCode = res.status > 200 ? res.status : false

  return { errorCode, show: data, params }
}

export default CatchAll
