async function getData() {
  const res = await fetch(`https://strangerthings-quotes.vercel.app/api/quotes`, {
    next: { tags: ['collection'] },
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()

  return (
    <>
      <h1>Hello, Statically Rendered Server Component (same as static-fetch-1)</h1>
      <dl>
        <dt>Quote</dt>
        <dd>{data[0].quote}</dd>
        <dt>Time</dt>
        <dd>{Date.now()}</dd>
      </dl>
    </>
  )
}
