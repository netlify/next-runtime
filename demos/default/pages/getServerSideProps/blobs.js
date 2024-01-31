import { getDeployStore } from '@netlify/blobs'
import Link from 'next/link'

export async function getServerSideProps() {
  const store = getDeployStore()
  const blob = await store.get('test-key', { type: 'json' })

  return {
    props: {
      blob,
      time: new Date().getTime(),
    },
  }
}

const BlobPage = ({ blob, time }) => (
  <>
    <p>
      hello <code>{JSON.stringify(blob) ?? `undefined`}</code>
    </p>
    <span id="anotherTime">time: {time}</span>
    <Link href="/" id="home">
      to home
    </Link>
    <br />
    <Link href="/something" id="something">
      to something
    </Link>
  </>
)
export default BlobPage
