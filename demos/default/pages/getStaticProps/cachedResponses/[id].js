import Link from 'next/link'
import { writeFile, readFile } from 'fs/promises'
import path from 'path'
import { serialize, deserialize } from 'v8'

const Show = ({ show, time }) => (
  <div>
    <p>
      This page bulk fetches all data and individually caches that data to the filesystem during path generation in
      getStaticPaths(). Each entry is pulled from the filesystem and referenced indivually in getStaticProps().
    </p>
    <p>This is a common optimization pattern for large sites.</p>
    <p>Ids 1 and 2 are prerendered and others should 404.</p>
    <hr />

    <h1>Show #{show.id}</h1>
    <p>{show.name}</p>
    <p>Rendered at {time} (slowly)</p>
    <hr />

    <Link href="/">
      <a>Go back home</a>
    </Link>
  </div>
)

export async function getStaticPaths() {
  // Set the paths we want to pre-render
  const paths = [{ params: { id: '1' } }, { params: { id: '2' } }]

  // Series could be faster in some cases
  Promise.all(
    // This is a somewhat convoluted example because it's typically pagination (less network overhead) that leads people to this pattern.
    paths.map(async (entry) => {
      const { id } = entry.params
      const res = await fetch(`https://api.tvmaze.com/shows/${id}`)

      const props = {
        show: await res.json(),
        time: new Date().toLocaleTimeString(),
      }

      await writeFile(path.join(process.cwd(), `demos/default/cachedResponses/${id}.db`), serialize(props))
    }),
  )

  // We'll pre-render only these paths at build time.
  // { fallback: false } means other routes should 404.
  return { paths, fallback: false }
}

export async function getStaticProps({ params: { id } }) {
  const data = await readFile(path.join(process.cwd(), `demos/default/cachedResponses/${id}.db`))

  return {
    props: deserialize(data),
  }
}

export default Show
