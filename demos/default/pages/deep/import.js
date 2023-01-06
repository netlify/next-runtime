import Link from 'next/link'
import dynamic from 'next/dynamic'
const Header = dynamic(() => import(/* webpackChunkName: 'header' */ '../../components/Header'), { ssr: true })

const Show = ({ show }) => (
  <div>
    <Header />
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

    <Link href="/">Go back home</Link>
  </div>
)

export const getServerSideProps = async ({ params }) => {
  const res = await fetch('https://tvproxy.netlify.app/shows/42')
  const data = await res.json()

  return {
    props: {
      show: data,
    },
  }
}

export default Show
