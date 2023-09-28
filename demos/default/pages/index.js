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

        <p>This is a demo of a NextJS application with Incremental Static Regeneration (ISR).</p>

        <h2>Incremental Static Regeneration</h2>

        <p>
          This page is rendered by an On-Demand Builder (ODB) function. It fetches a random list of five TV shows from
          the TVmaze REST API. After 60 seconds, the ODB cache is invalidated and the page will be re-rendered on the
          next request.
        </p>
        <code>NODE_ENV: {nodeEnv}</code>

        <ul data-testid="list-server-side">
          {shows.map(({ id, name }) => (
            <li key={id}>
              <Link href={`/shows/${id}`}>
                #{id}: {name}
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
                #{id}: {name}
              </Link>
            </li>
          ))}
        </ul>

        <h2>Catch-All Routes</h2>

        <ul data-testid="list-catch-all">
          <li>
            <Link href={`/shows/73/whatever/path/you/want`}>/shows/73/whatever/path/you/want</Link>
          </li>
          <li>
            <Link href={`/shows/94/whatever/path/you`}>/shows/94/whatever/path/you</Link>
          </li>
          <li>
            <Link href={`/shows/106/whatever/path`}>/shows/106/whatever/path</Link>
          </li>
        </ul>

        <h2>Static Pages</h2>

        <ul data-testid="list-static">
          <li>
            <Link href="/static">Static NextJS page: /static</Link>
          </li>
          <li>
            <Link href="/static/123456789">Static NextJS page with dynamic routing: /static/:id</Link>
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
            <Link href="/fr">/fr</Link>
          </li>
          <li>
            <Link href="/en">/en (default locale)</Link>
          </li>
        </ul>
        <h2>Page types</h2>
        <ul>
          <li>
            <Link href="/getServerSideProps/static">/getServerSideProps/static (SSR)</Link>
          </li>
          <li>
            <Link href="/getServerSideProps/1">/getServerSideProps/1 (SSR)</Link>
          </li>
          <li>
            <Link href="/getServerSideProps/all/1">/getServerSideProps/all/1 (SSR)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/static">/getStaticProps/static (CDN)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/1">/getStaticProps/1 (CDN)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/3">/getStaticProps/3 (404)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallback/1">/getStaticProps/withFallback/1 (CDN)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallback/3">/getStaticProps/withFallback/3 (ODB)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallbackBlocking/1">/getStaticProps/withFallbackBlocking/1 (CDN)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/withFallbackBlocking/3">/getStaticProps/withFallbackBlocking/3 (ODB)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/with-revalidate">/getStaticProps/with-revalidate (ODB)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/1">/getStaticProps/withRevalidate/1 (ODB)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/3">/getStaticProps/withRevalidate/3 (404)</Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallback/1">
              /getStaticProps/withRevalidate/withFallback/1 (ODB)
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallback/3">
              /getStaticProps/withRevalidate/withFallback/3 (ODB)
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallbackBlocking/1">
              /getStaticProps/withRevalidate/withFallbackBlocking/1 (ODB)
            </Link>
          </li>
          <li>
            <Link href="/getStaticProps/withRevalidate/withFallbackBlocking/3">
              /getStaticProps/withRevalidate/withFallbackBlocking/3 (ODB)
            </Link>
          </li>
          <li>
            <Link href="/old/image">Rewrite (should display image)</Link>
          </li>
          <li>
            <Link href="/rewriteToStatic">Rewrite to static (should show getStaticProps/1)</Link>
          </li>
        </ul>
        <h4>appDir</h4>
        <ul>
          <li>
            <Link href="/blog/erica">app dir page</Link>
          </li>
        </ul>
        <h4>Preview mode</h4>
        <p>Preview mode: </p>
        <ul>
          <li>
            <Link href="/previewTest">Check for preview mode</Link>
          </li>
          <li>
            <Link href="/api/enterPreview">Enter preview</Link>
          </li>
          <li>
            <Link href="/api/exitPreview">Exit preview</Link>
          </li>
        </ul>
      </div>
    </div>
  )
}

export async function getStaticProps(context) {
  const dev = process.env.CONTEXT !== 'production'

  // Set a random page between 1 and 100
  const randomPage = Math.floor(Math.random() * 100) + 1
  // FIXME: stub out in dev
  const server = dev
    ? `https://tvproxy.netlify.app/shows/page/${randomPage}`
    : `https://tvproxy.netlify.app/shows/page/${randomPage}`

  // Get the data
  const res = await fetch(server)
  const data = await res.json()

  return {
    props: {
      shows: data.slice(0, 5),
      nodeEnv: process.env.NODE_ENV || null,
    },
    revalidate: 60,
  }
}

export default Index
