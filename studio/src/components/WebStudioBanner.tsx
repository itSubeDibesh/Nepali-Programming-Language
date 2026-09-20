'use client';

import { useEffect, useState } from 'react';
import { isWebStudio } from '@/lib/env';

/**
 * WebStudioBanner
 *
 * Shown only when running on nepali.dibe.sh (or NEXT_PUBLIC_WEB_STUDIO=true).
 * Informs users that the web version is read-only / sandbox-only, and offers
 * a download link for the full desktop app.
 */
export default function WebStudioBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run on client; isWebStudio() checks window.location.hostname
    if (isWebStudio()) {
      // Respect prior dismissal for this session
      const wasDismissed = sessionStorage.getItem('web-studio-banner-dismissed') === '1';
      if (!wasDismissed) setVisible(true);
    }
  }, []);

  if (!visible || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('web-studio-banner-dismissed', '1');
    setDismissed(true);
  };

  return (
    <div
      role="banner"
      aria-label="Web Studio notice"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.45rem 1rem',
        background: 'linear-gradient(90deg, #0f2027 0%, #1a3a2a 50%, #0f2027 100%)',
        borderBottom: '1px solid rgba(52, 211, 153, 0.25)',
        fontSize: '0.78rem',
        lineHeight: '1.4',
        color: '#a7f3d0',
        flexShrink: 0,
        zIndex: 50,
      }}
    >
      {/* Left: icon + message */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span aria-hidden="true" style={{ fontSize: '1rem' }}>🌐</span>
        <strong style={{ color: '#34d399', fontWeight: 600 }}>वेब स्टुडियो (Web Studio)</strong>
        <span style={{ color: '#6ee7b7' }}>
          — हेर्नुहोस्, चलाउनुहोस् र कम्पाइल गर्नुहोस् मात्र।
          फाइल सेव वा डिस्क पहुँच उपलब्ध छैन।
        </span>
        <span style={{ color: '#9ca3af', marginLeft: '0.25rem' }}>
          (View, run &amp; compile only — no file save or disk access.)
        </span>
        <span style={{ color: '#64748b' }}>•</span>
        <span style={{ color: '#94a3b8' }}>
          खुला स्रोत (Open Source) — निर्माता:{' '}
          <a
            href="https://dibe.sh"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#34d399', fontWeight: 600, textDecoration: 'underline' }}
          >
            दिबेश राज सुवेदी (dibe.sh)
          </a>
        </span>
      </span>

      {/* Right: download link + close */}
      <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <a
          href="https://github.com/itSubeDibesh/Nepali-Programming-Language/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (typeof window !== 'undefined') {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('open-download-modal'));
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.2rem 0.65rem',
            borderRadius: '0.35rem',
            background: 'rgba(52,211,153,0.12)',
            border: '1px solid rgba(52,211,153,0.35)',
            color: '#34d399',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background 0.15s, border-color 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(52,211,153,0.22)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(52,211,153,0.6)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(52,211,153,0.12)';
            (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(52,211,153,0.35)';
          }}
        >
          ⬇ डेस्कटप डाउनलोड (Download Desktop App)
        </a>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#6b7280',
            fontSize: '1rem',
            padding: '0.1rem 0.25rem',
            lineHeight: 1,
            borderRadius: '0.2rem',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#d1d5db'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
        >
          ✕
        </button>
      </span>
    </div>
  );
}
