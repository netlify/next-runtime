import Link from 'next/link'
import dynamic from 'next/dynamic'
const Header = dynamic(() => import(/* webpackChunkName: 'header' */ '../components/Header'), { ssr: true })
import { useRouter } from 'next/router'

const Index = ({ shows, nodeEnv }) => {
  const { locale } = useRouter()

  return (
    <div>
      <img
        src="/next-on-netlify.png"
        alt="NextJS on Netlify Banner"
        className="self-center w-full max-h-80 max-w-5xl m-auto"
      />

      <div>
        <Header />

        <p>This is a demo of a NextJS application with Server-Side Rendering (SSR).</p>

        <h2>Server-Side Rendering</h2>

        <p>
          This page is server-side rendered. It fetches a random list of five TV shows from the TVmaze REST API. Refresh
          this page to see it change.
        </p>
        <code>NODE_ENV: {nodeEnv}</code>

        <ul data-testid="list-server-side">
          {shows.map(({ id, name }) => (
            <li key={id}>
              <Link href={`/shows/${id}`}>
                <a>
                  #{id}: {name}
                </a>
              </Link>
            </li>
          ))}
        </ul>

        <h2>Dynamic Pages</h2>
        <p>Click on a show to check out a server-side rendered page with dynamic routing (/shows/:id).</p>

        <ul data-testid="list-dynamic-pages">
          {shows.slice(0, 3).map(({ id, name }) => (
            <li key={id}>
              <Link href={`/shows/${id}`}>
                <a>
                  #{id}: {name}
                </a>
              </Link>
            </li>
          ))}
        </ul>

        <h2>Catch-All Routes</h2>

        <ul data-testid="list-catch-all">
          <li>
            <Link href={`/shows/73/whatever/path/you/want`}>
              <a>/shows/73/whatever/path/you/want</a>
            </Link>
          </li>
          <li>
            <Link href={`/shows/94/whatever/path/you`}>
              <a>/shows/94/whatever/path/you</a>
            </Link>
          </li>
          <li>
            <Link href={`/shows/106/whatever/path`}>
              <a>/shows/106/whatever/path</a>
            </Link>
          </li>
        </ul>

        <h2>Static Pages</h2>

        <ul data-testid="list-static">
          <li>
            <Link href="/static">
              <a>Static NextJS page: /static</a>
            </Link>
          </li>
          <li>
            <Link href="/static/123456789">
              <a>Static NextJS page with dynamic routing: /static/:id</a>
            </Link>
          </li>
        </ul>

        <h2>Localization</h2>
        <p>
          Localization (i18n) is supported! This demo uses <code>fr</code> with <code>en</code> as the default locale
          (at <code>/</code>).
        </p>
        <strong>The current locale is {locale}</strong>
        <p>Click on the links below to see the above text change</p>
        <ul data-testid="list-localization">
          <li>
            <Link href="/fr">
              <a>/fr</a>
            </Link>
          </li>
          <li>
            <Link href="/en">
              <a>/en (default locale)</a>
            </Link>
          </li>
        </ul>
        <h2>Page types</h2>
        <ul>
          <li>
            <Link href="/getServerSideProps/static">
              <a>/getServerSideProps/static (SSR)</a>
            </Link>
          </li>
          <li>
            <Link href="/getServerSideProps/1">
              <a>/getServerSideProps/1 (SSR)</a>
            </Link>
          </li>
          <li>
            <Link href="/getServerSideProps/all/1">
              <a>/getServerSideProps/all/1 (SSR)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/static">
              <a>/getStaticProps/static (CDN)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/1">
              <a>/getStaticProps/1 (CDN)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/3">
              <a>/getStaticProps/3 (404)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallback/1">
              <a>/getStaticProps/withFallback/1 (CDN)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallback/3">
              <a>/getStaticProps/withFallback/3 (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallbackBlocking/1">
              <a>/getStaticProps/withFallbackBlocking/1 (CDN)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallbackBlocking/3">
              <a>/getStaticProps/withFallbackBlocking/3 (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/with-revalidate">
              <a>/getStaticProps/with-revalidate (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/1">
              <a>/getStaticProps/withRevalidate/1 (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/3">
              <a>/getStaticProps/withRevalidate/3 (404)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallback/1">
              <a>/getStaticProps/withRevalidate/withFallback/1 (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallback/3">
              <a>/getStaticProps/withRevalidate/withFallback/3 (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallbackBlocking/1">
              <a>/getStaticProps/withRevalidate/withFallbackBlocking/1 (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallbackBlocking/3">
              <a>/getStaticProps/withRevalidate/withFallbackBlocking/3 (ODB)</a>
            </Link>
          </li>
          <li>
            <Link href="/old/image">
              <a>Rewrite (should display image)</a>
            </Link>
          </li>
          <li>
            <Link href="/rewriteToStatic">
              <a>Rewrite to static (should show getStaticProps/1)</a>
            </Link>
          </li>
        </ul>
        <h4>Preview mode</h4>
        <p>Preview mode: </p>
        <ul>
          <li>
            <Link href="/previewTest">
              <a>Check for preview mode</a>
            </Link>
          </li>
          <li>
            <Link href="/api/enterPreview">
              <a>Enter preview</a>
            </Link>
          </li>
          <li>
            <Link href="/api/exitPreview">
              <a>Exit preview</a>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

Index.getInitialProps = async function () {
  const dev = process.env.CONTEXT !== 'production'

  // Set a random page between 1 and 100
  const randomPage = Math.floor(Math.random() * 100) + 1
  // FIXME: stub out in dev
  const server = dev
    ? `https://api.tvmaze.com/shows?page=${randomPage}`
    : `https://api.tvmaze.com/shows?page=${randomPage}`

  // Get the data
  const res = await fetch(server)
  const data = await res.json()

  return { shows: data.slice(0, 5), nodeEnv: process.env.NODE_ENV || null }
}

export default Index
