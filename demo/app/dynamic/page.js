async function getData() {
  const res = await fetch(`https://strangerthings-quotes.vercel.app/api/quotes`, {
    cache: 'no-store',
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()

  return (
    <h1>
      {data[0].quote} at {Date.now()}
    </h1>
  )
}
