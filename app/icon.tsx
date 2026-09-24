import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 256, height: 256 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0c2114 0%, #0b0f0b 100%)',
          borderRadius: 56,
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="#3dff6e" strokeWidth="1.5">
          <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9 1.5 0 3 .4 4.5 1.2C16 8 13 10 11 13c-1.2 1.8-1.6 4-1 7Z" />
          <path d="M11 20c0-4 1.5-8 5-11" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
