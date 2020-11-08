export default function Test({ data, type }) {
  const items = JSON.parse(data) || []
  return (
    <div>
      <h1>{type}</h1>
      <ul>
        {items.map((item, i) => <li key={`item-${i}`}>{item}</li>)}
      </ul>
    </div>
  )
}

export async function getStaticProps({ preview }) {
  const type = preview ? 'basics' : 'defense'
  const url = `https://minecraft-api.netlify.com/api/${type}`
  const res = await fetch(url)
  const data = await res.json()
  return {
    props: {
      data: JSON.stringify(data),
      type
    }
  }
}
