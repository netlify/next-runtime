import { useRouter } from 'next/router'
import '../styles/globals.css'

function MyApp({ Component, pageProps }) {
  const { push } = useRouter()

  if (typeof window !== `undefined`) {
    // @ts-ignore
    window.__navigate = push
  }
  const getLayout = Component.getLayout || ((page) => page)

  return <div className="prose ml-14 mt-10 mb-20">{getLayout(<Component {...pageProps} />)}</div>
}

export default MyApp
