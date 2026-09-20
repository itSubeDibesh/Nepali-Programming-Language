import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, IBM_Plex_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import WebStudioBanner from '@/components/WebStudioBanner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const ibmPlexDevanagari = IBM_Plex_Sans_Devanagari({
  weight: ['400', '500', '600', '700'],
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://nepali.dibe.sh'),
  title: 'नेपाली स्टुडियो | Nepali Programming Language IDE',
  description:
    'A modern, interactive developer playground and IDE for the Nepali Programming Language with live Devanagari transliteration, real-time AST inspector, and local AI assistant.',
  keywords: [
    'Nepali Programming Language',
    'नेपाली प्रोग्रामिङ भाषा',
    'Nepali Coding',
    'Devanagari IDE',
    'Nepali Code',
    'Dibesh Raj Subedi',
    'dibe.sh',
  ],
  authors: [{ name: 'Dibesh Raj Subedi', url: 'https://dibe.sh' }],
  creator: 'Dibesh Raj Subedi',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'नेपाली स्टुडियो | Nepali Programming Language IDE',
    description:
      'A modern developer playground and compiler/interpreter for the Nepali Programming Language with live Devanagari transliteration.',
    url: 'https://nepali.dibe.sh',
    siteName: 'Nepali Studio',
    locale: 'ne_NP',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'नेपाली स्टुडियो | Nepali Programming Language IDE',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'नेपाली स्टुडियो | Nepali Programming Language IDE',
    description:
      'Devanagari-first developer environment for the Nepali Programming Language created by Dibesh Raj Subedi.',
    creator: '@itSubeDibesh',
    images: ['/opengraph-image'],
  },
};

export const viewport: Viewport = {
  themeColor: '#060911',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ne"
      suppressHydrationWarning
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${ibmPlexDevanagari.variable}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#060911] text-slate-100 font-sans antialiased overflow-hidden h-screen w-screen selection:bg-emerald-500/30"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {/* Web Studio banner — shown only on nepali.dibe.sh (client-side only, no SSR flash) */}
        <WebStudioBanner />
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden min-h-0">
          {children}
        </div>
      </body>
    </html>
  );
}
