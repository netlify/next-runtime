import Error from 'next/error'
import Link from 'next/link'

const Show = () => {
  return (
    <div>
      <p>Add a number between 1 and 10000 to the URL</p>
      <hr />

      <Link href="/">Go back home</Link>
    </div>
  )
}

export default Show
