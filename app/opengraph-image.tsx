import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Magic Trip House — Premium quality, consegna discreta in tutta Europa'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background:
            'linear-gradient(135deg, #06140b 0%, #081009 55%, #070a10 100%)',
          position: 'relative',
          fontFamily: 'sans-serif',
        }}
      >
        {/* accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #06140b, #3dff6e, #f5c842, #3dff6e, #06140b)',
          }}
        />

        {/* leaf mark */}
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#3dff6e" strokeWidth="1.6" style={{ marginBottom: 26 }}>
          <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 9-9 1.5 0 3 .4 4.5 1.2C16 8 13 10 11 13c-1.2 1.8-1.6 4-1 7Z" />
          <path d="M11 20c0-4 1.5-8 5-11" />
        </svg>

        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: 2,
            color: '#edfaee',
            lineHeight: 1,
          }}
        >
          MAGIC TRIP HOUSE
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 26,
            fontSize: 34,
            color: '#9db8a0',
          }}
        >
          Premium quality · consegna discreta in tutta Europa
        </div>

        {/* pills */}
        <div style={{ display: 'flex', gap: 18, marginTop: 46 }}>
          {['Discreto', 'Tutta Europa', 'Top quality'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                padding: '12px 28px',
                borderRadius: 40,
                border: '2px solid rgba(61,255,110,.45)',
                background: 'rgba(61,255,110,.08)',
                color: '#3dff6e',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {t}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', marginTop: 42, fontSize: 30, fontWeight: 700, letterSpacing: 1, color: '#f5c842' }}>
          magictriphouse.shop
        </div>
      </div>
    ),
    { ...size },
  )
}
