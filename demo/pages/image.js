import Image from 'next/image'
import img from './unsplash.jpg'
import logo from './logomark.svg'

const Images = () => (
  <div>
    <Image src={img} width={1200} height={800} alt="shiba inu dog looks through a window" />
    <p>
      <a href="https://unsplash.com/photos/DVCyb0lssMk">Photo</a> by{' '}
      <a href="https://unsplash.com/@veraduez?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">
        Vera Duez
      </a>{' '}
      on <a href="https://unsplash.com/?utm_source=unsplash&utm_medium=referral&utm_content=creditCopyText">Unsplash</a>
    </p>
    <p>
      <Image src={logo} alt="netlify logomark" />
    </p>
  </div>
)

export default Images
