import Image from 'next/image'

export default function NextImageUsingNetlifyImageCDN() {
  return (
    <main>
      <h1>Remote Images with Netlify CDN</h1>
      <Image
        src="https://images.unsplash.com/photo-1574870111867-089730e5a72b"
        alt="a cute Giraffe"
        width={300}
        height={278}
      />
    </main>
  )
}
