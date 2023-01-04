import Error from 'next/error'
import Link from 'next/link'

const Show = ({ errorCode, show, env }) => {
  // If show item was not found, render 404 page
  if (errorCode) {
    return <Error statusCode={errorCode} />
  }

  // Otherwise, render show
  return (
    <div>
      <p>
        This page uses getInitialProps() to fetch the show with the ID provided in the URL: /shows/:id
        <br />
        Refresh the page to see server-side rendering in action.
        <br />
        You can also try changing the ID to any other number between 1-10000. Env: {env}
      </p>
      <hr />

      <h1>Show #{show.id}</h1>
      <p>{show.name}</p>

      <hr />

      <Link href="/">Go back home</Link>
    </div>
  )
}

export const getServerSideProps = async ({ params, req }) => {
  // The ID to render
  const { id } = params
  console.log(req.headers)
  const res = await fetch(`https://tvproxy.netlify.app/shows/${Number(id)}`)
  const data = await res.json()

  // Set error code if show item could not be found
  const errorCode = res.status > 200 ? res.status : false

  return {
    props: {
      errorCode,
      show: data,
      env: process.env.HELLO_WORLD || null,
    },
  }
}

export default Show
