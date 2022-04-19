import Error from 'next/error'
import Link from 'next/link'

const Show = () => {
  return (
    <div>
      <p>Add a number between 1 and 10000 to the URL</p>
      <hr />

      <Link href="/">
        <a>Go back home</a>
      </Link>
    </div>
  )
}

export default Show
