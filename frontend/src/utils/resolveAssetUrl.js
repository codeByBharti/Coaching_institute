/**
 * Turn relative API paths (/uploads/...) into full URLs in production.
 * Backend usually returns absolute URLs; this is a safe fallback for old rows.
 */
export function resolveAssetUrl(url) {
  if (url == null || url === '') return '';
  const s = String(url).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (!base) {
    return s.startsWith('/') ? s : `/${s}`;
  }
  return `${base}${s.startsWith('/') ? s : `/${s}`}`;
}

/** True if the material should open as a normal web link (not a forced download path). */
export function isHttpUrl(url) {
  if (!url) return false;
  return /^https?:\/\//i.test(String(url).trim());
}
