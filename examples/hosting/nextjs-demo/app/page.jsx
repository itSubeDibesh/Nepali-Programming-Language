// Deliberately dynamic (not statically pre-rendered) - the timestamp
// below is computed on the real server at real request time, so a
// second real curl a moment later returning a different value is the
// actual proof this is a live Next.js server, not a static file.
export const dynamic = "force-dynamic";

export default function Home() {
  const now = new Date().toISOString();
  return (
    <main>
      <h1>नमस्ते, NepaliOS!</h1>
      <p>Real Next.js server-side render at: {now}</p>
    </main>
  );
}
