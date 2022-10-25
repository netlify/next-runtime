import Image from 'next/legacy/image'

// This should cause an error, because broken-domain is not part of the configured next.config.js image domains
const Images = () => (
  <Image
    src="https://broken-domain/netlify/next-runtime/main/next-on-netlify.png"
    alt="Picture of the author"
    width={500}
    height={500}
  />
)

export default Images
