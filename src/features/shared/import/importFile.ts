/**
 * Helpers for importing a profile from a file saved on disk.
 *
 * The URL import can only work when a page is reachable from the browser
 * without a session (public CORS proxies get 401/403 from sites like Gaia
 * Online). Every browser can save the page the user is actually looking at —
 * Ctrl/⌘+S or View Source → Save — and these helpers turn that file into the
 * same markup stream the paste box accepts.
 */

/** Read a File (or Blob) as text, with a FileReader fallback for older engines. */
export async function readTextFile(file: Blob): Promise<string> {
  if (typeof (file as File).text === 'function') {
    try {
      return await (file as File).text();
    } catch {
      /* fall through to FileReader */
    }
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'));
    reader.readAsText(file);
  });
}

/**
 * Pull the page's own URL out of saved markup.
 *
 * A saved Gaia profile page carries `<link rel="canonical">` (and og:url), which
 * is exactly what the importer needs as the base for relative asset and
 * stylesheet URLs — so a dropped file resolves its CSS chain with no typing.
 */
export function extractCanonicalUrl(html: string): string | null {
  const tags = html.match(/<link[^>]*>|<meta[^>]*>/gi) || [];
  for (const tag of tags) {
    const isCanonical = /rel\s*=\s*["']?canonical["']?/i.test(tag);
    const isOgUrl = /(property|name)\s*=\s*["']?(og:url|twitter:url)["']?/i.test(tag);
    if (!isCanonical && !isOgUrl) continue;
    const raw = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!raw) continue;
    try {
      const url = new URL(raw);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    } catch {
      /* relative or malformed — ignore */
    }
  }
  return null;
}

/** Human readable file size for status lines. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
