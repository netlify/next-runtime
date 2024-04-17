import Image from 'next/image'

export default function NextImageUsingNetlifyImageCDN() {
  return (
    <main>
      <h1>Next/Image + Netlify Image CDN</h1>
      <Image src="/squirrel.jpg" alt="a cute squirrel (next/image)" width={300} height={278} />
    </main>
  )
}
