import React from 'react'
import Link from 'next/link'

export async function getServerSideProps() {
  return {
    props: {
      slugs: ['post-1', 'post-2'],
      time: (await import('perf_hooks')).performance.now(),
    },
  }
}

export default ({ slugs, time }) => {
  return (
    <>
      <p>Posts: {JSON.stringify(slugs)}</p>
      <span>time: {time}</span>
      <Link href="/" id="home">
        to home
      </Link>
    </>
  )
}
