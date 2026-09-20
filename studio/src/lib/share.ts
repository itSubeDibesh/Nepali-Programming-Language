// Share utility to compress and encode Nepali programs into URL hashes

export function encodeCodeToUrl(code: string, fileName = 'script.nep'): string {
  if (typeof window === 'undefined') return '';
  const payload = JSON.stringify({ name: fileName, code });
  // Base64 encode UTF-8 string safely
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  const url = new URL(window.location.href);
  url.hash = `code=${encodeURIComponent(base64)}`;
  return url.toString();
}

export function decodeCodeFromUrl(): { name: string; code: string } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes('code=')) return null;

  try {
    const raw = hash.split('code=')[1].split('&')[0];
    const decodedBase64 = decodeURIComponent(raw);
    const binary = atob(decodedBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.code === 'string') {
      return {
        name: parsed.name || 'shared.nep',
        code: parsed.code,
      };
    }
  } catch (e) {
    console.error('Failed to decode shared code from URL hash', e);
  }
  return null;
}
