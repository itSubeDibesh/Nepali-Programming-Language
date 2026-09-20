import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'नेपाली स्टुडियो | Nepali Programming Language IDE';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #060911 0%, #0B1528 50%, #060911 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          padding: '60px',
        }}
      >
        {/* Decorative Grid Lines */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Brand Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '28px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '24px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '56px',
              fontWeight: 'bold',
              color: '#34d399',
              boxShadow: '0 0 50px rgba(16, 185, 129, 0.3)',
            }}
          >
            न
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: '52px',
                fontWeight: 'bold',
                color: '#ffffff',
                letterSpacing: '-1px',
              }}
            >
              नेपाली स्टुडियो
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#34d399',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              Nepali Programming Language Studio
            </div>
          </div>
        </div>

        {/* Tagline Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(51, 65, 85, 0.8)',
            borderRadius: '16px',
            padding: '16px 32px',
            color: '#cbd5e1',
            fontSize: '22px',
            textAlign: 'center',
            maxWidth: '900px',
            zIndex: 10,
            marginBottom: '36px',
          }}
        >
          Devanagari-first syntax • Live Transliteration • Native Rust Engine • Web &amp; Desktop IDE
        </div>

        {/* Footer Credit & Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            maxWidth: '900px',
            color: '#94a3b8',
            fontSize: '18px',
            zIndex: 10,
            borderTop: '1px solid rgba(30, 41, 59, 0.8)',
            paddingTop: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#34d399', fontWeight: 'bold' }}>🌐 nepali.dibe.sh</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>By</span>
            <span style={{ color: '#ffffff', fontWeight: 600 }}>Dibesh Raj Subedi</span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#34d399' }}>Open Source (MIT)</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
