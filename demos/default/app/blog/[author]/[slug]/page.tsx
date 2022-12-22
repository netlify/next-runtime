import { notFound } from 'next/navigation'

export const revalidate = null

export const dynamicParams = true

export default function Page({ params }) {
  if (params.author === 'matt') {
    return notFound()
  }
  return (
    <>
      <p id="page">/blog/[author]/[slug]</p>
      <p id="params">{JSON.stringify(params)}</p>
      <p id="date">{Date.now()}</p>
    </>
  )
}

export function generateStaticParams({ params }: any) {
  console.log('/blog/[author]/[slug] generateStaticParams', JSON.stringify(params))

  switch (params.author) {
    case 'erica': {
      return [
        {
          slug: 'first-post',
        },
      ]
    }
    case 'sarah': {
      return [
        {
          slug: 'second-post',
        },
      ]
    }
    case 'nick': {
      return [
        {
          slug: 'first-post',
        },
        {
          slug: 'second-post',
        },
      ]
    }
    case 'rob': {
      return [
        {
          slug: 'second-post',
        },
      ]
    }

    default: {
      throw new Error(`unexpected author param received ${params.author}`)
    }
  }
}
