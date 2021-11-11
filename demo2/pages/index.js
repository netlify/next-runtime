import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Home() {
  const { locale } = useRouter()

  return (
    <div>
      <h1>Demo 2: Basepath</h1>
      <bold>The current locale is {locale} </bold>
    </div>
  )
}
