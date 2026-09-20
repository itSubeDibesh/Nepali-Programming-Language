'use client';
import dynamic from 'next/dynamic';
import React from 'react';

// Client-only dynamic mount disables SSR hydration mismatch
// while synchronously initializing user state from localStorage on first client render.
const StudioWorkspace = dynamic(
  () => import('../components/StudioWorkspace'),
  { ssr: false }
);

export default function Page() {
  return <StudioWorkspace />;
}
