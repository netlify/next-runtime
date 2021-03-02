import Error from 'next/error'
import Link from 'next/link'

const CatchAll = ({ errorCode, show, params, queryStringParams }) => {
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
      </p>

      <p>
        Refresh the page to see server-side rendering in action.
        <br />
        You can also try changing the URL to something random, such as /shows/
        {show.id}/whatever/path/you/want
      </p>

      <p>
        You can also use query string parameters, for example: /shows/{show.id}
        /whatever/path/you/want?search=dog
        <br />
        If you do, they will show up below:
        <br />
        {Object.keys(queryStringParams).map((key) => (
          <span key={key}>
            [{key}]: {queryStringParams[key]}
            <br />
          </span>
        ))}
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
}

CatchAll.getInitialProps = async ({ res: req, query }) => {
  // Get the params and query parameters to render
  const { params, ...queryStringParams } = query

  // Get the ID to render
  const id = params[0]

  // Get the data
  const res = await fetch(`https://api.tvmaze.com/shows/${id}`)
  const data = await res.json()

  // Set error code if show item could not be found
  const errorCode = res.status > 200 ? res.status : false

  return { errorCode, show: data, params, queryStringParams }
}

export default CatchAll
