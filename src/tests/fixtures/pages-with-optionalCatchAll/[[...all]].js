import { useRouter } from 'next/router'
import Link from 'next/link'

const CatchAll = ({ show }) => {
  const router = useRouter()

  // This is never shown on Netlify. We just need it for NextJS to be happy,
  // because NextJS will render a fallback HTML page.
  if (router.isFallback) {
    return <div>Loading...</div>
  }

  return (
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
}

export async function getServerSideProps({ params }) {
  // The ID to render
  const { all } = params
  const id = all ? all[0] : 1

  const res = await fetch(`https://api.tvmaze.com/shows/${id}`)
  const data = await res.json()

  return {
    props: {
      show: data,
    },
  }
}

export default CatchAll
