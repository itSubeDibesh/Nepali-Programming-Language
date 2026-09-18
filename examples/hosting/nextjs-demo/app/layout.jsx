export const metadata = { title: "NepaliOS Next.js demo" };

export default function RootLayout({ children }) {
  return (
    <html lang="ne">
      <body>{children}</body>
    </html>
  );
}
