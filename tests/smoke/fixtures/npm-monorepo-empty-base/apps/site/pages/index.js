import { TestElement } from '@packages/ui/test.jsx'

export default function Home({ ssr }) {
  return (
    <main>
      <TestElement testid="smoke">SSR: {ssr ? 'yes' : 'no'}</TestElement>
    </main>
  )
}

export const getServerSideProps = async () => {
  return {
    props: {
      ssr: true,
    },
  }
}
