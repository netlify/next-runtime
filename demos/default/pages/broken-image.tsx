import Image from 'next/image'

// This should cause an error, because broken-domain is not part of the configured next.config.js image domains
const Images = () => (
  <Image
    src="https://netlify-plugin-nextjs-demo.netlify.app/next-on-netlify.png"
    alt="Picture of the author"
    width={500}
    height={500}
  />
)

export default Images
