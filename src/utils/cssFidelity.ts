/**
 * CSS fidelity helpers for profile import.
 *
 * Gaia profiles do not ship a single stylesheet: they combine
 *   • `<link rel="stylesheet">` nodes (Gaia's own theme CSS + third-party
 *     libraries such as Google Fonts, Font Awesome, Animate.css, Bootstrap),
 *   • `<style>` blocks written by the profile author, and
 *   • `@import` chains inside either of the above.
 *
 * To render (and export) a profile 1:1 the whole chain has to be preserved *in
 * order*, with every relative `url()` / `@import` resolved against the sheet it
 * came from. This module does exactly that — it never invents, filters or
 * reorders declarations.
 */

export type StylesheetKind = 'gaia' | 'library' | 'external';

export interface StylesheetRecord {
  url: string;
  ok: boolean;
  /** Where the sheet was referenced from. */
  from: 'link' | 'import';
  kind: StylesheetKind;
  /** Friendly name for known Gaia/CDN sheets (`Google Fonts`, `Font Awesome`, …). */
  label?: string;
  /** Size of the fetched text, in bytes. */
  bytes?: number;
}

/** Well-known third-party CSS Gaia profiles pull in (used for reporting). */
const KNOWN_SOURCES: Array<{ test: RegExp; kind: StylesheetKind; label: string }> = [
  { test: /(^|\.)gaiaonline\.com$/i, kind: 'gaia', label: 'Gaia Online theme CSS' },
  { test: /gaiaonline\.com/i, kind: 'gaia', label: 'Gaia Online asset CSS' },
  { test: /fonts\.googleapis\.com|fonts\.gstatic\.com/i, kind: 'library', label: 'Google Fonts' },
  { test: /use\.fontawesome\.com|fontawesome|font-awesome/i, kind: 'library', label: 'Font Awesome' },
  { test: /animate(\.min)?\.css/i, kind: 'library', label: 'Animate.css' },
  { test: /bootstrap(\.min)?\.css|bootstrapcdn/i, kind: 'library', label: 'Bootstrap' },
  { test: /normalize(\.min)?\.css/i, kind: 'library', label: 'Normalize.css' },
  { test: /hover(\.min)?\.css/i, kind: 'library', label: 'Hover.css' },
  { test: /aos\.css|aos@/i, kind: 'library', label: 'AOS (scroll animations)' },
  { test: /jquery.*\.css|jquery-ui/i, kind: 'library', label: 'jQuery UI' },
  { test: /cdnjs\.cloudflare\.com/i, kind: 'library', label: 'cdnjs library' },
  { test: /cdn\.jsdelivr\.net|jsdelivr/i, kind: 'library', label: 'jsDelivr library' },
  { test: /unpkg\.com/i, kind: 'library', label: 'unpkg library' },
  { test: /maxcdn\.bootstrapcdn\.com/i, kind: 'library', label: 'BootstrapCDN' },
];

export function classifyStylesheet(url: string): { kind: StylesheetKind; label?: string } {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = url;
  }
  for (const entry of KNOWN_SOURCES) {
    if (entry.test.test(host) || entry.test.test(url)) {
      return { kind: entry.kind, label: entry.label };
    }
  }
  return { kind: 'external' };
}

/** Absolutize a CSS url against the sheet it was written in. */
export function absolutizeUrl(value: string, base: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('#') || trimmed.startsWith('var(')) {
    return trimmed;
  }
  try {
    return new URL(trimmed, base || undefined).toString();
  } catch {
    return trimmed;
  }
}

/**
 * Rewrite every relative `url(...)` **and** `@import` target so the CSS is
 * standalone: it can be inlined anywhere (shadow DOM, exported document,
 * iframe) and still resolve its images, fonts and nested sheets.
 */
export function rewriteCssAssetUrls(css: string, base: string): string {
  if (!base) return css;
  const withUrls = css.replace(
    /url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^'")]+)\1\s*\)/gi,
    (_match, quote: string, rawUrl: string) => {
      const absolute = absolutizeUrl(rawUrl, base);
      const q = quote || '"';
      return `url(${q}${absolute}${q})`;
    }
  );
  return rewriteImportTargets(withUrls, base);
}

/** Rewrite the URL of `@import` rules (quoted or `url()` form) to be absolute. */
export function rewriteImportTargets(css: string, base: string): string {
  const refs = findCssImports(css);
  if (!refs.length) return css;
  let out = css;
  for (const ref of [...refs].reverse()) {
    const absolute = absolutizeUrl(ref.url, base);
    if (absolute === ref.url) continue;
    const replacement = `${ref.raw.slice(0, ref.urlStart)}${absolute}${ref.raw.slice(ref.urlEnd)}`;
    out = out.slice(0, ref.start) + replacement + out.slice(ref.end);
  }
  return out;
}

export interface CssImportRef {
  /** Raw target as written. */
  url: string;
  /** Offset of the target inside the `@import` rule. */
  urlStart: number;
  urlEnd: number;
  /** Offsets of the whole statement. */
  start: number;
  end: number;
  raw: string;
}

/**
 * Find `@import` statements outside of comments and strings, with the exact
 * offsets of both the statement and its URL — so a caller can replace it
 * *in place* (order preserved) instead of moving rules around.
 */
export function findCssImports(css: string): CssImportRef[] {
  const refs: CssImportRef[] = [];
  let i = 0;
  let inComment = false;
  let quote: string | null = null;

  while (i < css.length) {
    const ch = css[i];
    const next = css[i + 1];

    if (inComment) {
      if (ch === '*' && next === '/') {
        inComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (quote) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      inComment = true;
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i += 1;
      continue;
    }

    if (ch === '@' && css.slice(i, i + 7).toLowerCase() === '@import') {
      const start = i;
      let cursor = i + 7;
      while (cursor < css.length && /\s/.test(css[cursor])) cursor += 1;

      // Prelude runs to the terminating `;` (or a stray brace in malformed CSS).
      let depth = 0;
      let innerQuote: string | null = null;
      let end = -1;
      for (let k = cursor; k < css.length; k += 1) {
        const c = css[k];
        if (innerQuote) {
          if (c === '\\') {
            k += 1;
            continue;
          }
          if (c === innerQuote) innerQuote = null;
          continue;
        }
        if (c === '"' || c === "'") {
          innerQuote = c;
          continue;
        }
        if (c === '(') depth += 1;
        else if (c === ')') depth = Math.max(0, depth - 1);
        else if (c === ';' && depth === 0) {
          end = k + 1;
          break;
        } else if ((c === '{' || c === '}') && depth === 0) {
          end = k;
          break;
        }
      }
      if (end === -1) {
        i = cursor;
        continue;
      }

      const preludeStart = cursor;
      const prelude = css.slice(preludeStart, end);
      let urlStart = -1;
      let urlEnd = -1;
      let url = '';

      const urlFn = prelude.match(/url\(\s*(['"]?)([^'")]+)\1\s*\)/i);
      if (urlFn) {
        url = urlFn[2].trim();
        urlStart = preludeStart + (urlFn.index || 0);
        urlEnd = urlStart + urlFn[0].length;
        // Narrow to the raw target (skip `url(` + quote).
        const open = urlFn[0].indexOf(urlFn[2]);
        urlStart += open;
        urlEnd = urlStart + urlFn[2].length;
      } else {
        const quoted = prelude.match(/(['"])([^'"]+)\1/);
        if (quoted) {
          url = quoted[2].trim();
          urlStart = preludeStart + (quoted.index || 0) + 1;
          urlEnd = urlStart + quoted[2].length;
        }
      }

      if (url) refs.push({ url, urlStart, urlEnd, start, end, raw: css.slice(start, end) });
      i = end;
      continue;
    }

    i += 1;
  }

  return refs;
}

export interface ResolvedImports {
  css: string;
  imports: StylesheetRecord[];
}

/**
 * Replace `@import` statements with the fetched sheet contents, recursively.
 * The imported CSS lands **where the @import was**, which is how browsers
 * cascade it, and each inlined sheet keeps its own base URL for url().
 */
export async function resolveCssImports(
  css: string,
  base: string,
  fetchCss: (url: string) => Promise<string>,
  options: { depth?: number; onProgress?: (message: string) => void } = {}
): Promise<ResolvedImports> {
  const depth = options.depth ?? 2;
  const refs = findCssImports(css);
  if (!refs.length || depth <= 0) return { css, imports: [] };

  const imports: StylesheetRecord[] = [];
  let out = css;

  for (const ref of [...refs].reverse()) {
    const absolute = absolutizeUrl(ref.url, base);
    const meta = classifyStylesheet(absolute);
    try {
      const fetched = await fetchCss(absolute);
      const nested = await resolveCssImports(fetched, absolute, fetchCss, {
        depth: depth - 1,
        onProgress: options.onProgress,
      });
      imports.push({
        url: absolute,
        ok: true,
        from: 'import',
        kind: meta.kind,
        label: meta.label,
        bytes: fetched.length,
      });
      imports.push(...nested.imports);
      const inline = `/* @import ${absolute} (inlined) */\n${rewriteCssAssetUrls(nested.css, absolute)}`;
      out = out.slice(0, ref.start) + inline + out.slice(ref.end);
      options.onProgress?.(`@import inlined: ${absolute}`);
    } catch {
      imports.push({ url: absolute, ok: false, from: 'import', kind: meta.kind, label: meta.label });
      options.onProgress?.(`@import blocked: ${absolute}`);
      // Leave the (now absolute) @import in place so the browser can still try.
      const replacement = `${ref.raw.slice(0, ref.urlStart - ref.start)}${absolute}${ref.raw.slice(
        ref.urlEnd - ref.start
      )}`;
      out = out.slice(0, ref.start) + replacement + out.slice(ref.end);
    }
  }

  return { css: out, imports };
}

/* -------------------------------------------------------------------------- */
/* Computed background probing                                                 */
/* -------------------------------------------------------------------------- */

export interface BackgroundSnapshot {
  color: string;
  image: string;
  repeat: string;
  size: string;
  position: string;
  attachment: string;
}

export interface ProbedBackground {
  html: BackgroundSnapshot | null;
  body: BackgroundSnapshot | null;
  /** The element the *visible* surface came from (`body`, `html`, `#viewer`). */
  origin: string;
  /** `true` when at least one layer paints something. */
  paints: boolean;
  /** Set when the stylesheet pass could not be awaited (still usable). */
  partial?: boolean;
}

function snapshotOf(win: Window, el: Element | null): BackgroundSnapshot | null {
  if (!el) return null;
  const cs = win.getComputedStyle(el);
  return {
    color: cs.backgroundColor || 'transparent',
    image: cs.backgroundImage || 'none',
    repeat: cs.backgroundRepeat || 'repeat',
    size: cs.backgroundSize || 'auto',
    position: cs.backgroundPosition || '0% 0%',
    attachment: cs.backgroundAttachment || 'scroll',
  };
}

function paintsAnything(snapshot: BackgroundSnapshot | null): boolean {
  if (!snapshot) return false;
  const hasImage = !!snapshot.image && snapshot.image !== 'none';
  const hasColor = !!snapshot.color && !/^(transparent|rgba\(0,\s*0,\s*0,\s*0\))$/i.test(snapshot.color);
  return hasImage || hasColor;
}

/**
 * Render the imported document in a hidden iframe and read the *computed*
 * background of `<html>`, `<body>` and `#viewer`.
 *
 * This is what makes "1:1" real: instead of guessing from the CSS text, the
 * browser resolves the whole cascade (linked sheets, `@import`s, media queries,
 * layers, gradients) and we simply reuse its answer.
 */
export async function probeRenderedBackground(
  html: string,
  options: { timeoutMs?: number; settleMs?: number } = {}
): Promise<ProbedBackground | null> {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;
  if (!html || !html.trim()) return null;

  const timeoutMs = options.timeoutMs ?? 8000;
  const settleMs = options.settleMs ?? 220;

  return new Promise<ProbedBackground | null>((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-same-origin');
    frame.setAttribute('aria-hidden', 'true');
    frame.title = 'background probe';
    frame.style.cssText =
      'position:fixed;left:-20000px;top:0;width:1380px;height:900px;border:0;visibility:hidden';
    let settled = false;

    const measure = (partial = false): ProbedBackground | null => {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc) return null;
      const snapshots = {
        html: snapshotOf(win, doc.documentElement),
        body: snapshotOf(win, doc.body),
        viewer: snapshotOf(win, doc.getElementById('viewer')),
      };
      const order: Array<[string, BackgroundSnapshot | null]> = [
        ['body', snapshots.body],
        ['html', snapshots.html],
        ['#viewer', snapshots.viewer],
      ];
      const winner = order.find(([, snapshot]) => paintsAnything(snapshot));
      return {
        html: snapshots.html,
        body: snapshots.body,
        origin: winner ? winner[0] : 'none',
        paints: !!winner,
        partial,
      };
    };

    const finish = (value: ProbedBackground | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      try {
        frame.remove();
      } catch {
        /* detached */
      }
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(measure(true)), timeoutMs);

    frame.onload = async () => {
      const doc = frame.contentDocument;
      if (!doc) {
        finish(null);
        return;
      }
      const links = Array.from(
        doc.querySelectorAll('link[rel="stylesheet"]')
      ) as HTMLLinkElement[];
      const pending = links.map(
        (link) =>
          new Promise<void>((res) => {
            if (link.sheet) {
              res();
              return;
            }
            const done = () => res();
            link.addEventListener('load', done, { once: true });
            link.addEventListener('error', done, { once: true });
          })
      );
      await Promise.race([
        Promise.all(pending),
        new Promise<void>((res) => window.setTimeout(res, 2500)),
      ]);
      // Let the engine apply the freshly loaded sheets (+ their @imports).
      await new Promise<void>((res) =>
        window.setTimeout(() => window.requestAnimationFrame(() => res()), settleMs)
      );
      finish(measure());
    };

    frame.srcdoc = html;
    document.body.appendChild(frame);

    // Guard for DOM environments without srcdoc support (jsdom, older engines):
    // an iframe that never receives a document would otherwise sit until the
    // full timeout and hold up the import.
    if (!html.trim() || !('srcdoc' in frame)) {
      finish(null);
      return;
    }
    window.setTimeout(() => {
      const doc = frame.contentDocument;
      if (!doc || doc.documentElement?.childElementCount === 0) finish(null);
    }, 600);
  });
}

/** Serialize a snapshot back into CSS declarations (exact computed values). */
export function snapshotDeclarations(snapshot: BackgroundSnapshot, indent = '  '): string {
  const lines: string[] = [];
  if (snapshot.color && !/^transparent$/i.test(snapshot.color)) {
    lines.push(`${indent}background-color: ${snapshot.color};`);
  }
  if (snapshot.image && snapshot.image !== 'none') {
    lines.push(`${indent}background-image: ${snapshot.image};`);
    lines.push(`${indent}background-repeat: ${snapshot.repeat};`);
    lines.push(`${indent}background-size: ${snapshot.size};`);
    lines.push(`${indent}background-position: ${snapshot.position};`);
    lines.push(`${indent}background-attachment: ${snapshot.attachment};`);
  }
  return lines.join('\n');
}
