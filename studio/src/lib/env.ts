import { RunMode } from './types';

/**
 * Detects whether the Studio is running inside the standalone native desktop app
 * (Tauri v2 IPC bridge, or legacy wry+tao window with __TAURI__ shim).
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
 * Detects whether the Studio is running as the hosted web instance
 * at nepali.dibe.sh (or any deployment with NEXT_PUBLIC_WEB_STUDIO=true).
 *
 * Web Studio restrictions:
 *   - View / Run / Compile only (sandbox mode)
 *   - No disk access, no file save, no OS mode
 */
export function isWebStudio(): boolean {
  // Server-side: rely on the env var injected at build time
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_WEB_STUDIO === 'true';
  }
  // Client-side: either env var or the live domain
  if (process.env.NEXT_PUBLIC_WEB_STUDIO === 'true') return true;
  const host = window.location.hostname;
  return host === 'nepali.dibe.sh' || host === 'www.nepali.dibe.sh';
}

/**
 * Detects whether the Studio is running in a local environment
 * (desktop app / localhost / LAN) vs. a remote hosted deployment.
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
 *
 * | Environment                  | Modes         | Notes                    |
 * |------------------------------|---------------|--------------------------|
 * | Native Desktop (Tauri)       | os, sandbox   | Full native access       |
 * | Local dev / LAN              | os, sandbox   | Developer machine        |
 * | Web Studio (nepali.dibe.sh)  | sandbox       | No disk, no OS calls     |
 */
export function getAvailableModes(): RunMode[] {
  // Web Studio: strictly sandbox only — no OS access, no disk
  if (isWebStudio()) {
    return ['sandbox'];
  }
  // Native desktop app: full OS + sandbox access
  if (isDesktopApp()) {
    return ['os', 'sandbox'];
  }
  // Local development server
  if (isLocalEnvironment()) {
    return ['os', 'sandbox'];
  }
  // Fallback: any other remote/unknown environment → sandbox only
  return ['sandbox'];
}
