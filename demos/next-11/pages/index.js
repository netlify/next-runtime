import Link from 'next/link'

export default function IndexPage() {
  return (
    <>
      <h1>Next 11 Example</h1>
      <p>This is an example site to test Next 11 features</p>
      <div>
        <Link href="/isr-not-found">ISR page returning not found</Link>
      </div>
    </>
  )
}
