/**
 * Path sanitization for every path relayed from the orchestrator to an agent.
 *
 * Agents scope all filesystem access to one server-data root, so a malicious
 * or hallucinated path must never escape that root. This helper normalizes
 * candidate paths and returns `null` for anything suspicious; callers reject
 * the request when they receive null.
 */

export function sanitizeRelativePath(input: string): string | null {
  if (typeof input !== 'string') return null;

  let p = input.trim();
  if (p === '') return null;

  // Length sanity cap (paths beyond this are abusive).
  if (p.length > 512) return null;

  // Reject embedded NUL and other control characters.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(p)) return null;

  // Reject absolute paths: Windows drive letters (C:/, C:\) and UNC (\\server\share).
  if (/^[a-zA-Z]:/.test(p)) return null;
  if (p.startsWith('\\\\')) return null;
  // Reject leading slashes (absolute on POSIX, and \-rooted on Windows).
  if (p.startsWith('/') || p.startsWith('\\')) return null;

  // Normalize backslashes to forward slashes so `\..\` tricks are visible to
  // the segment check below.
  const normalized = p.replace(/\\/g, '/');

  // Collapse duplicate slashes and resolve . / .. segments manually so we can
  // detect traversal even before it happens on disk.
  const segments: string[] = [];
  for (const seg of normalized.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      return null; // any '..' segment is rejected outright
    }
    // Windows reserved device names (even without extension).
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(seg)) return null;
    segments.push(seg);
  }

  if (segments.length === 0) return null;

  return segments.join('/');
}
