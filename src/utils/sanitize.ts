/**
 * Validates that an external URL uses http: or https: before binding to <a href>.
 * Prevents javascript:, data:, or vbscript: URLs from crowd-sourced OSM/Wolt feeds.
 */
export function safeHttpUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Strips non-dialable characters and returns a safe tel: URI, or null if empty.
 */
export function safeTelHref(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 4) return null;
  return `tel:${cleaned}`;
}
