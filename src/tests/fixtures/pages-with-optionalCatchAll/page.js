import Link from 'next/link'

const Index = () => (
  <div>
    <ul>
      <li>
        <Link href="/">
          <a>/</a>
        </Link>
      </li>
      <li>
        <Link href="/catch/25/catch/all">
          <a>/catch/25/catch/all</a>
        </Link>
      </li>
      <li>
        <Link href="/catch/75/undefined/path/test">
          <a>/catch/75/undefined/path/test</a>
        </Link>
      </li>
    </ul>
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

export default Index
