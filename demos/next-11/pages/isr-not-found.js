import React from 'react'

const Page = () => {
  return <h1>Not found</h1>
}

export async function getStaticProps() {
  return {
    props: {},
    notFound: true,
    revalidate: 60,
  }
}

export default Page
