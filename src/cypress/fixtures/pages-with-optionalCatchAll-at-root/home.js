import Link from 'next/link'

const Home = () => (
  <div>
    <h1>NextJS on Netlify</h1>

    <ul>
      <li>
        <Link href="/[bar]/ssr" as="/1337/ssr">
          <a>1337/ssr</a>
        </Link>
      </li>
      <li>
        <Link href="/[bar]/ssr" as="/1338/ssr">
          <a>1338/ssr</a>
        </Link>
      </li>
    </ul>
  </div>
)

export default Home
