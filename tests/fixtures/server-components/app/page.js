import Link from 'next/link'

export default function Page() {
  return (
    <div>
      <h1>Hello, Statically Rendered Server Component</h1>
      <ul>
        <li>
          <Link href="/static-fetch-1">static-fetch-1</Link>
        </li>
        <li>
          <Link href="/static-fetch-2">static-fetch-1</Link>
        </li>
        <li>
          <Link href="/static-fetch-dynamic">static-fetch-dynamic</Link>
        </li>
      </ul>
    </div>
  )
}
