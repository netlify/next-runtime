import Image from 'next/image'

export default function Domains() {
  return (
    <main>
      <h1>Remote Images with Netlify CDN</h1>
      <Image
        src="https://images.pexels.com/photos/406014/pexels-photo-406014.jpeg"
        alt="dog up close"
        width={300}
        height={278}
      />
    </main>
  )
}
