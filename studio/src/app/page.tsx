'use client';
import dynamic from 'next/dynamic';
import React from 'react';

const StudioWorkspace = dynamic(
  () => import('../components/StudioWorkspace'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#060911] text-slate-100">
        <header className="h-14 bg-[#0B0F19] border-b border-[#1E293B] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
              ने
            </div>
            <div>
              <div className="font-semibold text-sm tracking-wide text-white">
                नेपाली स्टुडियो <span className="text-xs text-emerald-400 font-mono font-normal">v1.0</span>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex bg-[#060911]" />
      </div>
    ),
  }
);

export default function Page() {
  return <StudioWorkspace />;
}
