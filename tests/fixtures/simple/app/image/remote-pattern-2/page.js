import Image from 'next/image'

export default function NextImageUsingNetlifyImageCDN() {
  return (
    <main>
      <h1>Remote Images with Netlify CDN</h1>
      <Image
        src="https://cdn.pixabay.com/photo/2017/02/20/18/03/cat-2083492_1280.jpg"
        alt="a cute Cat"
        width={300}
        height={183}
      />
    </main>
  )
}
