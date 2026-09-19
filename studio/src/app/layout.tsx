import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'नेपाली स्टुडियो | Nepali Programming Language IDE',
  description: 'A modern, interactive developer playground for the Nepali Programming Language with live Devanagari transliteration and AI assistant.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ne" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden h-screen w-screen selection:bg-indigo-500/30">
        {children}
      </body>
    </html>
  );
}
