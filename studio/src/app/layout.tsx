import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'नेपाली स्टुडियो | Nepali Programming Language IDE',
  description: 'A modern, interactive developer playground for the Nepali Programming Language with live Devanagari transliteration, real-time AST inspector, and local AI assistant.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'नेपाली स्टुडियो (Nepali Studio)',
    description: 'Devanagari-first developer environment for the Nepali Programming Language.',
    siteName: 'Nepali Studio',
    locale: 'ne_NP',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#060911',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ne" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Devanagari:wght@300;400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#060911] text-slate-100 font-sans antialiased overflow-hidden h-screen w-screen selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  );
}
