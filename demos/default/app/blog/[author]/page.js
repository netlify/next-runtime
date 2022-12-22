import Link from 'next/link'

export default async function Page({ params }) {
  await fetch('http://example.com', {
    next: { revalidate: 10 },
  })
  return (
    <>
      <p id="page">/blog/[author]</p>
      <p id="params">{JSON.stringify(params)}</p>
      <p id="date">{Date.now()}</p>
      <Link href="/blog/erica" id="author-1">
        /blog/erica
      </Link>
      <br />
      <Link href="/blog/sarah" id="author-2">
        /blog/sarah
      </Link>
      <br />
      <Link href="/blog/nick" id="author-3">
        /blog/nick
      </Link>
      <br />

      <Link href="/blog/erica/first-post" id="author-1-post-1">
        /blog/erica/first-post
      </Link>
      <br />
      <Link href="/blog/sarah/second-post" id="author-2-post-1">
        /blog/sarah/second-post
      </Link>
      <br />
      <Link href="/blog/nick/first-post" id="author-3-post-1">
        /blog/nick/first-post
      </Link>
      <br />
    </>
  )
}
