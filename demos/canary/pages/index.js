import Head from 'next/head'
import Image from 'next/image'

export default function Home() {
  return (
    <div>
      <Head>
        <title>Canary Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>Canary Next App</h1>
        <div>
          <p>Here's where we test out Next's canary features to ensure they work with our plugin .</p>
        </div>
      </main>

      <Image
        src="https://raw.githubusercontent.com/netlify/netlify-plugin-nextjs/main/next-on-netlify.png"
        alt="Picture of the author"
        width={540}
        height={191}
      />
    </div>
  )
}
