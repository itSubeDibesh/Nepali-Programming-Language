/**
 * Resilient clipboard utilities with multiple fallback strategies for Web and Tauri Desktop.
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Strategy 1: Tauri native invoke if in desktop mode
  if ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__ || (window as any).ipc) {
    try {
      const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
      if (typeof tauriInvoke === 'function') {
        await tauriInvoke('write_to_clipboard', { text });
        return true;
      }
    } catch {}
  }

  // Strategy 2: Modern Async Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  // Strategy 3: Hidden textarea with execCommand('copy')
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(el);
    if (successful) return true;
  } catch {
    // Fall through
  }

  return false;
}

export async function readFromClipboard(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Strategy 1: Tauri native invoke if in desktop mode
  if ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__ || (window as any).ipc) {
    try {
      const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke || (window as any).__TAURI__?.core?.invoke || (window as any).__TAURI__?.invoke;
      if (typeof tauriInvoke === 'function') {
        const text = await tauriInvoke('read_from_clipboard');
        if (typeof text === 'string') return text;
      }
    } catch {}
  }

  // Strategy 2: Async Clipboard API
  if (navigator?.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (typeof text === 'string') return text;
    } catch (e) {
      // Permission denied or blocked by browser security policy
    }
  }

  return null;
}
