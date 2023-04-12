import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const username = searchParams.get('username')

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          fontSize: 60,
          color: 'black',
          background: '#f6f6f6',
          width: '100%',
          height: '100%',
          paddingTop: 50,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          width="256"
          height="256"
          src={`https://github.com/${username || 'netlify'}.png`}
          style={{
            borderRadius: 128,
          }}
        />
        {username ? <p>github.com/{username}</p> : <p>Visit with &quot;?username=netlify&quot;</p>}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        // By default this has an immutable cache, but this is for testing
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  )
}
