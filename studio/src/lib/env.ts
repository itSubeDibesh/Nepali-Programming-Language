import { RunMode } from './types';

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
 * Returns the permitted execution modes for the current environment.
 * When hosted, raw 'os' host filesystem mode is completely hidden and isolated.
 */
export function getAvailableModes(): RunMode[] {
  if (isLocalEnvironment()) {
    return ['os', 'wasm', 'sandbox'];
  }
  return ['sandbox', 'wasm'];
}
