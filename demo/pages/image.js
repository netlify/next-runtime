import Image from 'next/image'
import img from './unsplash.jpg'

const Images = () => (
  <div>
    <Image src={img} width={1200} height={800} alt="puppy" />
  </div>
)

export default Images
