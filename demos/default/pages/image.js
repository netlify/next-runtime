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
      <Image
        src="https://raw.githubusercontent.com/netlify/next-runtime/main/demos/default/public/next-on-netlify.png"
        alt="Picture of the author"
        width={500}
        height={500}
      />
      <Image src="https://i.imgur.com/bxSRS3Jb.png" alt="Tawny Frogmouth" width={160} height={160} />
    </p>
  </div>
)

export default Images
