import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'PCR Booking — Car Rental Software for Independent Operators'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#080812',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <div style={{ color: '#2EBD6B', fontSize: 72, fontWeight: 900 }}>
          PCR Booking
        </div>
        <div style={{ color: '#ffffff', fontSize: 32, marginTop: 20 }}>
          Car Rental Software for Independent Operators
        </div>
        <div style={{ color: '#2EBD6B', fontSize: 24, marginTop: 16 }}>
          Free for up to 3 cars. No contracts.
        </div>
      </div>
    ),
    { ...size }
  )
}
