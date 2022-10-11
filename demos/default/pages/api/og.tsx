import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'experimental-edge',
}
export default function () {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Hi, it's {new Date().toLocaleTimeString()}!
      </div>
    ),
    {
      width: 1200,
      height: 600,
      debug: true,
    },
  )
}
