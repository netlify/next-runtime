import Link from 'next/link'

const StaticTest = ({ isPreview }) => {
  return (
    <div>
      <h1>Is preview? {isPreview ? 'Yes!' : 'No'}</h1>
      <p>
        <a href={isPreview ? '/api/exitPreview' : '/api/enterPreview'}>
          {isPreview ? 'Exit Preview' : 'Enter Preview'}
        </a>
      </p>
      <Link href="/">Go back home</Link>
    </div>
  )
}

export const getStaticProps = async ({ preview }) => {
  return {
    props: {
      isPreview: Boolean(preview),
    },
  }
}

export default StaticTest
