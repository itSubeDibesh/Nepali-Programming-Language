/**
 * Helper to determine if AI Assistant endpoint/backend is accessible.
 */
export async function checkAiAvailability(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // If explicitly disabled
  if (process.env.NEXT_PUBLIC_DISABLE_AI === 'true') {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/ask', {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return Boolean(data.available);
    }
    return false;
  } catch {
    return false;
  }
}
