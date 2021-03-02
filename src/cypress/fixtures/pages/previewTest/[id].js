import Error from 'next/error'
import Link from 'next/link'

const Show = ({ errorCode, show, person }) => {
  // If show/person item was not found, render 404 page
  if (errorCode) {
    return <Error statusCode={errorCode} />
  }

  // Otherwise, render show
  return (
    <div>
      <p>
        This page uses getServerSideProps() and is SSRed.
        <br />
        <br />
        By default, it shows the TV show by ID.
        <br />
        But when in preview mode, it shows person by ID instead.
      </p>

      <hr />

      {show ? (
        <div>
          <h1>Show #{show.id}</h1>
          <p>{show.name}</p>
        </div>
      ) : (
        <div>
          <h1>Person #{person.id}</h1>
          <p>{person.name}</p>
        </div>
      )}

      <hr />

      <Link href="/">
        <a>Go back home</a>
      </Link>
    </div>
  )
}

export const getServerSideProps = async (context) => {
  console.log(context)
  const { params, preview } = context

  let res = null
  let show = null
  let person = null

  // The ID to render
  const { id } = params

  // In preview mode, load person by ID
  if (preview) {
    res = await fetch(`https://api.tvmaze.com/people/${id}`)
    person = await res.json()
  }
  // In normal mode, load TV show by ID
  else {
    res = await fetch(`https://api.tvmaze.com/shows/${id}`)
    show = await res.json()
  }

  // Set error code if show/person could not be found
  const errorCode = res.status > 200 ? res.status : false

  return {
    props: {
      errorCode,
      show,
      person,
    },
  }
}

export default Show
