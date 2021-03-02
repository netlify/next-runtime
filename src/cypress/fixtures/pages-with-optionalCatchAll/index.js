import Link from 'next/link'

const Index = () => (
  <div>
    <ul>
      <li>
        <Link href="/catch/[[...all]]" as="/catch">
          <a>/catch</a>
        </Link>
      </li>
      <li>
        <Link href="/catch/[[...all]]" as="/catch/25/catch/all">
          <a>/catch/25/catch/all</a>
        </Link>
      </li>
      <li>
        <Link href="/catch/[[...all]]" as="/catch/75/undefined/path/test">
          <a>/catch/75/undefined/path/test</a>
        </Link>
      </li>
    </ul>
  </div>
)

export default Index
