import { RunMode } from './types';

/**
 * Detects whether the Studio is running inside the standalone native desktop app.
 */
export function isDesktopApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    Boolean((window as any).__TAURI_INTERNALS__) ||
    Boolean((window as any).__TAURI__) ||
    Boolean((window as any).ipc) ||
    window.location.port === '8765'
  );
}

/**
 * Detects whether the Studio is running in a local environment (desktop / localhost / native OS)
 * or a hosted/cloud deployment (e.g. Vercel, Cloudflare, remote server).
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development' || process.env.HOSTED_STUDIO !== 'true';
  }
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host.endsWith('.local');
}

/**
 * Returns the permitted execution modes for the current environment:
 * - Native Desktop IDE: Only supported native modes ('os', 'sandbox') — WASM is hidden.
 * - Local dev web: ('os', 'sandbox')
 * - Hosted Cloud / Web: strictly isolated ('sandbox' only)
 */
export function getAvailableModes(): RunMode[] {
  if (isDesktopApp()) {
    return ['os', 'sandbox'];
  }
  if (isLocalEnvironment()) {
    return ['os', 'sandbox'];
  }
  return ['sandbox'];
}
