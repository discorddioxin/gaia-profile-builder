import { ProfileElement, CanvasSettings } from '../types/profile';
import { CLIP_PRESETS } from './presets';

export interface ImportResult {
  elements: ProfileElement[];
  settings: Partial<CanvasSettings>;
  rawHtml: string;
  rawCss: string;
  scriptsRemoved: number;
  sourceUrl: string;
}

const V2_UNSUPPORTED_MESSAGE =
  'Only V2 profiles supported. The imported HTML must include #columns with #column_1, #column_2, and #column_3.';

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

/** Sleep helper for slow-loading pages */
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetch a URL's raw HTML using a series of CORS proxy fallbacks.
 * Tries direct fetch first, then proxies in order until one succeeds.
 */
async function fetchWithTimeout(url: string, timeoutMs = 25000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: 'cors', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchProfileHtml(
  url: string,
  onProgress?: (msg: string) => void
): Promise<string> {
  const attempts: Array<{ label: string; fn: () => Promise<string> }> = [
    { label: 'direct', fn: () => fetchWithTimeout(url) },
    ...CORS_PROXIES.map((proxy, i) => ({
      label: `proxy ${i + 1}`,
      fn: () => fetchWithTimeout(proxy(url)),
    })),
  ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    onProgress?.(`Trying ${attempt.label}…`);
    try {
      const html = await attempt.fn();
      if (html && html.length > 40) {
        onProgress?.(`Loaded via ${attempt.label} (${(html.length / 1024).toFixed(1)}KB)`);
        return html;
      }
      errors.push(`${attempt.label}: empty response`);
    } catch (err) {
      errors.push(`${attempt.label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(
    `All fetch attempts failed. Sites requiring login (Gaia Online, most forums) cannot be fetched directly — use "Import with HTML" and paste the page source. Details:\n${errors.join('\n')}`
  );
}

/** Strip all <script>...</script> blocks + inline event handlers + javascript: URLs */
export function sanitizeHtml(html: string): { clean: string; scriptsRemoved: number } {
  let scriptsRemoved = 0;

  const withoutScripts = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, () => {
    scriptsRemoved += 1;
    return '';
  });

  // Strip inline event handlers like onclick="...", onload="..."
  const withoutHandlers = withoutScripts.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Strip javascript: URLs
  const withoutJsUrls = withoutHandlers.replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');

  return { clean: withoutJsUrls, scriptsRemoved };
}

function assertGaiaV2DefaultLayout(doc: Document): void {
  const hasV2Columns =
    !!doc.querySelector('#columns') &&
    !!doc.querySelector('#column_1') &&
    !!doc.querySelector('#column_2') &&
    !!doc.querySelector('#column_3');
  if (!hasV2Columns) {
    throw new Error(V2_UNSUPPORTED_MESSAGE);
  }
}

/** Extract all CSS text preserving original <head> order as closely as possible. */
export async function extractCss(doc: Document, baseUrl: string): Promise<string> {
  const cssBlocks: string[] = [];

  const headNodes = Array.from(doc.head?.childNodes || []);
  for (const node of headNodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;

    if (el.tagName === 'STYLE') {
      if (el.textContent) cssBlocks.push(rewriteCssUrls(el.textContent, baseUrl));
      continue;
    }

    if (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet') {
      const href = (el as HTMLLinkElement).getAttribute('href');
      if (!href) continue;
      try {
        const absolute = new URL(href, baseUrl).toString();
        const css = await fetchProfileHtml(absolute);
        cssBlocks.push(`/* From ${absolute} */\n${rewriteCssUrls(css, absolute)}`);
      } catch {
        // Keep going; some stylesheets may be blocked even when the page itself isn't.
      }
    }
  }

  // Fallback: if head traversal found nothing, still scan stray <style> blocks.
  if (cssBlocks.length === 0) {
    doc.querySelectorAll('style').forEach((s) => {
      if (s.textContent) cssBlocks.push(rewriteCssUrls(s.textContent, baseUrl));
    });
  }

  return withGaiaPanelBaseCss(doc, cssBlocks.join('\n\n'));
}

function rewriteCssUrls(css: string, baseUrl: string): string {
  return css.replace(/url\(\s*(['"]?)(?!data:|https?:|\/\/|#)([^'"\)]+)\1\s*\)/gi, (_m, quote, rawUrl) => {
    try {
      const absolute = new URL(String(rawUrl).trim(), baseUrl).toString();
      const q = quote || '"';
      return `url(${q}${absolute}${q})`;
    } catch {
      return `url(${quote || ''}${rawUrl}${quote || ''})`;
    }
  });
}

function withGaiaPanelBaseCss(doc: Document, css: string): string {
  // Preserve imported profile CSS exactly. Earlier fallback CSS injection
  // changed Gaia panels from their original appearance and could override
  // legitimate imported layout rules. Dedicated support now affects editor
  // semantics/actions only, not visual styling.
  void doc;
  return css;
}

/** Parse a CSS block into a map of selector -> declaration object. */
function parseCssRules(css: string): Map<string, Record<string, string>> {
  const rules = new Map<string, Record<string, string>>();
  // Strip comments
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, '');

  const ruleRegex = /([^{}@]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRegex.exec(cleaned)) !== null) {
    const selectors = match[1].trim();
    const body = match[2];
    const decls: Record<string, string> = {};
    body.split(';').forEach((decl) => {
      const idx = decl.indexOf(':');
      if (idx === -1) return;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl
        .slice(idx + 1)
        .trim()
        .replace(/!important$/i, '')
        .trim();
      if (prop && val) decls[prop] = val;
    });

    selectors.split(',').forEach((sel) => {
      const key = sel.trim();
      if (!key) return;
      rules.set(key, { ...(rules.get(key) || {}), ...decls });
    });
  }
  return rules;
}

function parsePx(val?: string, fallback = 0): number {
  if (!val) return fallback;
  const m = val.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : fallback;
}

function parseOpacity(val?: string): number {
  if (!val) return 100;
  const n = parseFloat(val);
  if (isNaN(n)) return 100;
  return Math.round(n * 100);
}

function parseRotate(transform?: string): number {
  if (!transform) return 0;
  const m = transform.match(/rotate\(\s*(-?\d+(?:\.\d+)?)deg\s*\)/i);
  return m ? parseFloat(m[1]) : 0;
}

function parseBorder(val?: string): { width: number; style: string; color: string } {
  if (!val) return { width: 0, style: 'solid', color: '#4f46e5' };
  const widthMatch = val.match(/(\d+(?:\.\d+)?)px/);
  const styleMatch = val.match(/\b(solid|dashed|dotted|double|none)\b/i);
  const colorMatch = val.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/i);
  return {
    width: widthMatch ? parseFloat(widthMatch[1]) : 0,
    style: styleMatch ? styleMatch[1].toLowerCase() : 'solid',
    color: colorMatch ? colorMatch[0] : '#4f46e5',
  };
}

function parseAnimation(val?: string): {
  preset: string;
  duration: number;
  delay: number;
  timing: string;
  iteration: string;
  direction: string;
} | null {
  if (!val || val === 'none') return null;
  // e.g. "float 3s ease-in-out 0s infinite alternate"
  const parts = val.trim().split(/\s+/);
  const preset = parts[0] || 'float';
  const duration = parts[1] ? parsePx(parts[1], 3) : 3;
  const timing = parts[2] || 'ease-in-out';
  const delay = parts[3] ? parsePx(parts[3], 0) : 0;
  const iteration = parts[4] || 'infinite';
  const direction = parts[5] || 'normal';
  return { preset, duration, delay, timing, iteration, direction };
}

/**
 * Convert a sanitized DOM tree + CSS into ProfileElement objects.
 * Strategy: look for our canonical marker `<span style="color: #N">` first
 * (round-trip import for BBStudio profiles), and fall back to a generic
 * scan of top-level styled tags for arbitrary profile pages.
 */
export function reconstructElements(
  doc: Document,
  css: string
): { elements: ProfileElement[]; settings: Partial<CanvasSettings> } {
  const rules = parseCssRules(css);
  const elements: ProfileElement[] = [];

  // Detect profile container settings from `.profile_container` if present
  const containerRule =
    rules.get('.profile_container') || rules.get('div.profile_container') || {};
  const settings: Partial<CanvasSettings> = {};
  if (containerRule['width']) settings.width = parsePx(containerRule['width'], 720);
  if (containerRule['min-height'] || containerRule['height']) {
    settings.height = parsePx(containerRule['min-height'] || containerRule['height'], 600);
  }
  if (containerRule['background-color']) settings.backgroundColor = containerRule['background-color'];
  const bgImg = containerRule['background-image'];
  if (bgImg) {
    const m = bgImg.match(/url\(['"]?([^'")]+)['"]?\)/i);
    if (m) settings.backgroundImage = m[1];
  }

  // 1) Round-trip path: BBStudio marker spans
  const markerSpans = Array.from(
    doc.querySelectorAll('span[style*="color: #"], span[style*="color:#"]')
  ) as HTMLElement[];

  const filtered = markerSpans.filter((s) => {
    const style = s.getAttribute('style') || '';
    return /color\s*:\s*#\d+\b/i.test(style);
  });

  if (filtered.length > 0) {
    filtered.forEach((span, idx) => {
      const styleAttr = span.getAttribute('style') || '';
      const markerMatch = styleAttr.match(/color\s*:\s*(#\d+)/i);
      const marker = markerMatch ? markerMatch[1] : `#${idx + 1}`;
      const el = buildElementFromSpan(span, marker, rules, idx);
      if (el) elements.push(el);
    });
    return { elements, settings };
  }

  // 2) Generic path: find every meaningful visual node in the document
  //    (images, iframes, links with visible text, and text-bearing blocks)
  //    and reconstruct each as an editable ProfileElement with auto-layout.
  const meaningfulNodes = collectMeaningfulNodes(doc);
  const canvasWidth = settings.width || 720;

  let cursorY = 20;
  let cursorX = 20;
  let rowMaxHeight = 0;

  meaningfulNodes.forEach((node, idx) => {
    const el = buildElementFromGenericNode(node, idx, rules);
    if (!el) return;

    // Simple flow layout: pack elements left-to-right within canvasWidth, wrap on overflow
    if (cursorX + el.width > canvasWidth - 20) {
      cursorX = 20;
      cursorY += rowMaxHeight + 12;
      rowMaxHeight = 0;
    }
    el.x = cursorX;
    el.y = cursorY;
    cursorX += el.width + 12;
    rowMaxHeight = Math.max(rowMaxHeight, el.height);
    elements.push(el);
  });

  // Extend canvas height to fit all elements
  if (elements.length > 0) {
    const maxY = Math.max(...elements.map((e) => e.y + e.height));
    settings.height = Math.max(settings.height || 600, maxY + 40);
  }

  return { elements, settings };
}

/**
 * Walk the document body and collect only nodes that carry visible content:
 * images, iframes, anchor tags with text, and text-bearing block-level nodes
 * that are NOT ancestors of other collected nodes (avoids double-counting).
 */
function collectMeaningfulNodes(doc: Document): HTMLElement[] {
  const body = doc.body;
  if (!body) return [];

  const collected: HTMLElement[] = [];
  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'LINK',
    'META',
    'HEAD',
    'NOSCRIPT',
    'SVG',
    'FORM',
    'INPUT',
    'BUTTON',
    'SELECT',
    'TEXTAREA',
    'NAV',
    'HEADER',
    'FOOTER',
  ]);

  // Collect leaf-ish media & anchors first
  const media = Array.from(body.querySelectorAll('img, iframe')) as HTMLElement[];
  media.forEach((m) => {
    if (isVisibleEnough(m)) collected.push(m);
  });

  const links = Array.from(body.querySelectorAll('a')) as HTMLElement[];
  links.forEach((a) => {
    const text = (a.textContent || '').trim();
    if (text && text.length < 200 && isVisibleEnough(a) && !containsCollected(a, collected)) {
      collected.push(a);
    }
  });

  // Collect leaf text-bearing blocks (headings, paragraphs, list items, blockquotes, divs with only text)
  const TEXT_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'BLOCKQUOTE', 'LI', 'PRE', 'CODE'];
  TEXT_TAGS.forEach((tag) => {
    Array.from(body.getElementsByTagName(tag)).forEach((node) => {
      const el = node as HTMLElement;
      const text = (el.textContent || '').trim();
      if (text && !containsCollected(el, collected)) {
        collected.push(el);
      }
    });
  });

  // Fall back to leaf-ish divs with substantive text if we found nothing above
  if (collected.length === 0) {
    Array.from(body.querySelectorAll('div, section, article')).forEach((node) => {
      const el = node as HTMLElement;
      if (SKIP_TAGS.has(el.tagName)) return;
      const text = (el.textContent || '').trim();
      const hasBlockChildren = Array.from(el.children).some((c) =>
        ['DIV', 'SECTION', 'ARTICLE', 'P', 'H1', 'H2', 'H3'].includes(c.tagName)
      );
      if (text && text.length < 800 && !hasBlockChildren) {
        collected.push(el);
      }
    });
  }

  // Dedupe & cap
  const seen = new Set<HTMLElement>();
  const unique = collected.filter((n) => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  return unique.slice(0, 80); // hard cap to prevent runaway imports
}

function containsCollected(node: HTMLElement, collected: HTMLElement[]): boolean {
  return collected.some((c) => node.contains(c) && c !== node);
}

function isVisibleEnough(node: HTMLElement): boolean {
  const style = node.getAttribute('style') || '';
  if (/display\s*:\s*none/i.test(style)) return false;
  if (/visibility\s*:\s*hidden/i.test(style)) return false;
  return true;
}

function buildElementFromSpan(
  span: HTMLElement,
  marker: string,
  rules: Map<string, Record<string, string>>,
  idx: number
): ProfileElement | null {
  const selectorKey = `span[style*='color: ${marker}']`;
  const altKey = `span[style*="color: ${marker}"]`;
  const styles = { ...(rules.get(altKey) || {}), ...(rules.get(selectorKey) || {}) };

  // Look at first meaningful child to determine type
  const inner = firstMeaningfulChild(span);
  const type = detectType(span, inner);

  let content = '';
  let linkUrl: string | undefined;

  if (type === 'image' && inner instanceof HTMLImageElement) {
    content = inner.src;
  } else if (type === 'video' && inner instanceof HTMLIFrameElement) {
    const src = inner.src || '';
    const m = src.match(/(?:embed|v)\/([\w-]{11})/);
    content = m ? m[1] : src;
  } else if (type === 'link' && inner instanceof HTMLAnchorElement) {
    linkUrl = inner.href;
    content = inner.textContent?.trim() || '';
  } else {
    content = (inner?.textContent || span.textContent || '').trim();
  }

  const border = parseBorder(styles['border']);
  const anim = parseAnimation(styles['animation']);
  const clipPath = styles['clip-path'];
  const maskImage = styles['-webkit-mask-image'] || styles['mask-image'];

  return {
    id: `imported_${Date.now()}_${idx}`,
    name: `Imported ${type} #${idx + 1}`,
    type,
    content,
    linkUrl,
    colorMarker: marker,
    useAttributeSelector: true,
    x: parsePx(styles['left'], 20 + idx * 20),
    y: parsePx(styles['top'], 20 + idx * 20),
    width: parsePx(styles['width'], 200),
    height: parsePx(styles['height'], 60),
    zIndex: parsePx(styles['z-index'], idx + 1),
    rotate: parseRotate(styles['transform']),
    opacity: parseOpacity(styles['opacity']),
    locked: false,
    hidden: false,
    color: styles['color'] || '#e2e8f0',
    backgroundColor: styles['background-color'] || 'transparent',
    backgroundImage: extractBgUrl(styles['background-image']),
    fontSize: parsePx(styles['font-size'], 14),
    fontWeight: (styles['font-weight'] === 'bold' ? 'bold' : 'normal') as 'bold' | 'normal',
    fontStyle: (styles['font-style'] === 'italic' ? 'italic' : 'normal') as 'italic' | 'normal',
    textDecoration: (['underline', 'line-through'].includes(styles['text-decoration'])
      ? (styles['text-decoration'] as 'underline' | 'line-through')
      : 'none') as 'none' | 'underline' | 'line-through',
    textAlign: (['left', 'center', 'right', 'justify'].includes(styles['text-align'])
      ? (styles['text-align'] as 'left' | 'center' | 'right' | 'justify')
      : 'left') as 'left' | 'center' | 'right' | 'justify',
    fontFamily: styles['font-family'] || 'inherit',
    borderWidth: border.width,
    borderColor: border.color,
    borderStyle: border.style as ProfileElement['borderStyle'],
    borderRadius: parsePx(styles['border-radius'], 0),
    boxShadow: styles['box-shadow'] || 'none',
    backdropFilter: styles['backdrop-filter'],
    padding: parsePx(styles['padding'], 0),
    overflow: (['visible', 'hidden', 'auto'].includes(styles['overflow'])
      ? styles['overflow']
      : 'hidden') as ProfileElement['overflow'],
    mask: {
      enabled: !!maskImage,
      type: maskImage?.includes('radial') ? 'radial-gradient' : 'linear-gradient',
      preset: 'custom',
      angle: 180,
      stops: [],
      feather: 30,
      invert: false,
      shape: 'circle',
      customValue: maskImage,
    },
    clip: {
      enabled: !!clipPath,
      type: clipPath?.startsWith('circle')
        ? 'circle'
        : clipPath?.startsWith('inset')
        ? 'inset'
        : 'polygon',
      preset: 'custom',
      vertices: parseClipPolygon(clipPath) || CLIP_PRESETS.hexagon.vertices,
      circleRadius: 50,
      circleCenterX: 50,
      circleCenterY: 50,
      insetRadius: 8,
      customValue: clipPath,
    },
    animation: {
      enabled: !!anim,
      preset: (anim?.preset as ProfileElement['animation']['preset']) || 'float',
      duration: anim?.duration ?? 3,
      delay: anim?.delay ?? 0,
      timing: (anim?.timing as ProfileElement['animation']['timing']) || 'ease-in-out',
      iteration: (anim?.iteration as ProfileElement['animation']['iteration']) || 'infinite',
      direction: (anim?.direction as ProfileElement['animation']['direction']) || 'normal',
      trigger: 'always',
    },
  };
}

function buildElementFromGenericNode(
  node: HTMLElement,
  idx: number,
  rules: Map<string, Record<string, string>>
): ProfileElement | null {
  if (!node || node.tagName === 'STYLE' || node.tagName === 'LINK' || node.tagName === 'META')
    return null;

  const type = detectType(node, node);
  const marker = `#${idx + 1}`;
  const text = (node.textContent || '').trim().slice(0, 600);

  let content = text;
  let linkUrl: string | undefined;
  let width = 400;
  let height = 80;

  if (type === 'image') {
    const img =
      node.tagName === 'IMG'
        ? (node as HTMLImageElement)
        : (node.querySelector('img') as HTMLImageElement | null);
    content = img?.getAttribute('src') || img?.src || '';
    width = Math.min(500, parseFloat(img?.getAttribute('width') || '') || 160);
    height = Math.min(500, parseFloat(img?.getAttribute('height') || '') || 160);
  } else if (type === 'video') {
    const iframe =
      node.tagName === 'IFRAME'
        ? (node as HTMLIFrameElement)
        : (node.querySelector('iframe') as HTMLIFrameElement | null);
    const src = iframe?.getAttribute('src') || iframe?.src || '';
    const m = src.match(/(?:embed|v)\/([\w-]{11})/);
    content = m ? m[1] : src;
    width = 320;
    height = 180;
  } else if (type === 'link') {
    const a =
      node.tagName === 'A'
        ? (node as HTMLAnchorElement)
        : (node.querySelector('a') as HTMLAnchorElement | null);
    if (a) {
      linkUrl = a.getAttribute('href') || a.href;
      content = a.textContent?.trim() || linkUrl || '';
    }
    width = Math.min(400, Math.max(120, content.length * 8));
    height = 44;
  } else {
    // Text/heading/paragraph: size by content length + tag semantics
    const tag = node.tagName;
    if (/^H[1-6]$/.test(tag)) {
      const level = parseInt(tag.slice(1), 10);
      height = 60 - level * 4;
      width = Math.min(700, Math.max(220, text.length * 9));
    } else if (tag === 'PRE' || tag === 'CODE') {
      width = 500;
      height = Math.min(300, Math.max(80, text.split('\n').length * 18 + 20));
    } else {
      const lines = Math.max(1, Math.ceil(text.length / 60));
      width = Math.min(680, Math.max(200, text.length * 6));
      height = Math.min(320, Math.max(40, lines * 22 + 20));
    }
  }

  // Merge in any inline style + matching CSS rule declarations
  const inlineStyle = parseInlineStyle(node.getAttribute('style'));
  const cssMatches = matchCssRules(node, rules);
  const styles = { ...cssMatches, ...inlineStyle };

  const border = parseBorder(styles['border']);
  const anim = parseAnimation(styles['animation']);

  return {
    id: `imported_${Date.now()}_${idx}`,
    name: friendlyName(node, type, idx),
    type,
    content,
    linkUrl,
    colorMarker: marker,
    useAttributeSelector: true,
    x: 20,
    y: 20,
    width: Math.round(width),
    height: Math.round(height),
    zIndex: idx + 1,
    rotate: parseRotate(styles['transform']),
    opacity: parseOpacity(styles['opacity']),
    locked: false,
    hidden: false,
    color: styles['color'] || '#e2e8f0',
    backgroundColor: styles['background-color'] || 'rgba(15, 23, 42, 0.55)',
    backgroundImage: extractBgUrl(styles['background-image']),
    fontSize: parsePx(styles['font-size'], /^H[1-6]$/.test(node.tagName) ? 22 : 14),
    fontWeight: (styles['font-weight'] === 'bold' || /^H[1-6]$/.test(node.tagName)
      ? 'bold'
      : 'normal') as 'bold' | 'normal',
    fontStyle: (styles['font-style'] === 'italic' ? 'italic' : 'normal') as 'italic' | 'normal',
    textDecoration: (['underline', 'line-through'].includes(styles['text-decoration'])
      ? (styles['text-decoration'] as 'underline' | 'line-through')
      : 'none') as 'none' | 'underline' | 'line-through',
    textAlign: (['left', 'center', 'right', 'justify'].includes(styles['text-align'])
      ? (styles['text-align'] as 'left' | 'center' | 'right' | 'justify')
      : 'left') as 'left' | 'center' | 'right' | 'justify',
    fontFamily: styles['font-family'] || 'inherit',
    borderWidth: border.width,
    borderColor: border.color,
    borderStyle: border.style as ProfileElement['borderStyle'],
    borderRadius: parsePx(styles['border-radius'], 4),
    boxShadow: styles['box-shadow'] || 'none',
    backdropFilter: styles['backdrop-filter'],
    padding: parsePx(styles['padding'], type === 'image' || type === 'video' ? 0 : 8),
    overflow: 'hidden',
    mask: {
      enabled: false,
      type: 'linear-gradient',
      preset: 'fade-bottom',
      angle: 180,
      stops: [],
      feather: 20,
      invert: false,
      shape: 'circle',
    },
    clip: {
      enabled: false,
      type: 'polygon',
      preset: 'hexagon',
      vertices: CLIP_PRESETS.hexagon.vertices,
      circleRadius: 50,
      circleCenterX: 50,
      circleCenterY: 50,
      insetRadius: 0,
    },
    animation: {
      enabled: !!anim,
      preset: (anim?.preset as ProfileElement['animation']['preset']) || 'float',
      duration: anim?.duration ?? 3,
      delay: anim?.delay ?? 0,
      timing: (anim?.timing as ProfileElement['animation']['timing']) || 'ease-in-out',
      iteration: (anim?.iteration as ProfileElement['animation']['iteration']) || 'infinite',
      direction: (anim?.direction as ProfileElement['animation']['direction']) || 'normal',
      trigger: 'always',
    },
  };
}

/** Parse an inline `style="..."` attribute into a plain map */
function parseInlineStyle(inlineAttr: string | null): Record<string, string> {
  if (!inlineAttr) return {};
  const out: Record<string, string> = {};
  inlineAttr.split(';').forEach((decl) => {
    const idx = decl.indexOf(':');
    if (idx === -1) return;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const val = decl
      .slice(idx + 1)
      .trim()
      .replace(/!important$/i, '')
      .trim();
    if (prop && val) out[prop] = val;
  });
  return out;
}

/** Given a DOM node, find all CSS rules whose selectors match & merge their declarations */
function matchCssRules(
  node: HTMLElement,
  rules: Map<string, Record<string, string>>
): Record<string, string> {
  const merged: Record<string, string> = {};
  rules.forEach((decls, selector) => {
    try {
      if (node.matches(selector)) {
        Object.assign(merged, decls);
      }
    } catch {
      /* invalid selector — skip */
    }
  });
  return merged;
}

/** Human-readable name derived from tag + id/class + text preview */
function friendlyName(node: HTMLElement, type: ProfileElement['type'], idx: number): string {
  const tag = node.tagName.toLowerCase();
  const id = node.id ? `#${node.id}` : '';
  const cls = node.className && typeof node.className === 'string'
    ? '.' + node.className.split(/\s+/).slice(0, 2).join('.')
    : '';
  const preview = (node.textContent || '').trim().slice(0, 24);
  const label = `${tag}${id}${cls}`.slice(0, 30);
  return preview
    ? `${label} — ${preview}${preview.length >= 24 ? '…' : ''}`
    : `${label || type} #${idx + 1}`;
}

function firstMeaningfulChild(node: HTMLElement): HTMLElement | null {
  for (const child of Array.from(node.children)) {
    if (child instanceof HTMLElement) return child;
  }
  return null;
}

function detectType(
  outer: HTMLElement,
  inner: HTMLElement | null
): ProfileElement['type'] {
  const check = inner || outer;
  if (check.tagName === 'IMG' || check.classList.contains('user_img') || outer.querySelector('img.user_img')) return 'image';
  if (check.tagName === 'IFRAME' || outer.querySelector('iframe')) return 'video';
  if (check.tagName === 'A' || outer.querySelector('a')) return 'link';
  if (check.classList.contains('quote') || outer.querySelector('.quote')) return 'quote';
  if (check.classList.contains('code') || outer.querySelector('.code') || check.tagName === 'PRE') return 'code';
  if (check.classList.contains('clear')) return 'clear';
  return 'text';
}

function extractBgUrl(bgImage?: string): string | undefined {
  if (!bgImage) return undefined;
  const m = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/i);
  return m ? m[1] : undefined;
}

function parseClipPolygon(clip?: string): { x: number; y: number }[] | null {
  if (!clip) return null;
  const m = clip.match(/polygon\(([^)]+)\)/i);
  if (!m) return null;
  const points = m[1].split(',').map((p) => {
    const nums = p.trim().split(/\s+/).map(parsePx);
    return { x: nums[0] || 0, y: nums[1] || 0 };
  });
  return points.length >= 3 ? points : null;
}

/** Top-level: fetch URL, sanitize, parse, and reconstruct. */
export async function importProfileFromUrl(
  url: string,
  onProgress?: (msg: string) => void
): Promise<ImportResult> {
  onProgress?.('Fetching page…');
  const rawHtml = await fetchProfileHtml(url, onProgress);

  onProgress?.('Sanitizing (removing scripts)…');
  const { clean, scriptsRemoved } = sanitizeHtml(rawHtml);

  const parser = new DOMParser();
  const doc = parser.parseFromString(clean, 'text/html');

  assertGaiaV2DefaultLayout(doc);

  // Rewrite relative image/link URLs to absolute so the raw HTML render works
  rewriteRelativeUrls(doc, url);

  // Stamp every element with a stable ID so the editable canvas can track selection
  injectBbIds(doc);

  onProgress?.('Extracting stylesheets…');
  const rawCss = await extractCss(doc, url);

  // Small settle delay — some pages benefit from a moment of yield before extraction
  await sleep(150);

  onProgress?.('Reconstructing elements…');
  const { elements, settings } = reconstructElements(doc, rawCss);

  onProgress?.(`Done — ${elements.length} elements, ${scriptsRemoved} scripts removed`);

  return {
    elements,
    settings,
    rawHtml: serializeDoc(doc, rawCss),
    rawCss,
    scriptsRemoved,
    sourceUrl: url,
  };
}

/** Rewrite `src` / `href` to absolute URLs so images/links resolve when rendered */
function rewriteRelativeUrls(doc: Document, baseUrl: string): void {
  const attrPairs: Array<[string, string]> = [
    ['img', 'src'],
    ['iframe', 'src'],
    ['a', 'href'],
    ['source', 'src'],
    ['video', 'src'],
    ['audio', 'src'],
  ];
  attrPairs.forEach(([tag, attr]) => {
    doc.querySelectorAll(tag).forEach((el) => {
      const val = el.getAttribute(attr);
      if (!val || val.startsWith('data:') || val.startsWith('#')) return;
      try {
        const abs = new URL(val, baseUrl).toString();
        el.setAttribute(attr, abs);
      } catch {
        /* ignore malformed URLs */
      }
    });
  });
  doc.querySelectorAll('[style]').forEach((el) => {
    const style = el.getAttribute('style');
    if (!style) return;
    el.setAttribute('style', rewriteCssUrls(style, baseUrl));
  });
  // Ensure a <base> tag exists so any remaining relative refs resolve on render
  if (!doc.querySelector('base') && doc.head) {
    const base = doc.createElement('base');
    base.href = baseUrl;
    doc.head.insertBefore(base, doc.head.firstChild);
  }
}

function serializeDoc(doc: Document, css?: string): string {
  if (doc.head) {
    let viewport = doc.head.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!viewport) {
      viewport = doc.createElement('meta');
      viewport.name = 'viewport';
      doc.head.insertBefore(viewport, doc.head.firstChild);
    }
    viewport.content = 'width=1000, initial-scale=1';
  }
  if (css && doc.head) {
    const previous = doc.head.querySelector('style[data-bbstudio-imported-css]');
    previous?.remove();
    const style = doc.createElement('style');
    style.setAttribute('data-bbstudio-imported-css', '');
    style.textContent = css;
    doc.head.appendChild(style);
  }
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

/**
 * Walk the whole body and stamp every element with a stable `data-bb-id`.
 * The editable canvas uses these IDs to track selection and route updates
 * without needing fragile DOM paths that break when the tree mutates.
 */
export function injectBbIds(doc: Document): void {
  if (!doc.body) return;
  let counter = 1;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  const nodes: Element[] = [];
  let n = walker.nextNode();
  while (n) {
    nodes.push(n as Element);
    n = walker.nextNode();
  }
  nodes.forEach((el) => {
    if (!el.hasAttribute('data-bb-id')) {
      el.setAttribute('data-bb-id', `bb-${counter++}`);
    }
  });
}

/**
 * Import from a raw HTML string pasted by the user.
 * No network fetch is performed, so external stylesheets referenced by
 * <link rel="stylesheet"> are skipped — inline <style> blocks are still parsed.
 * Users can prepend their own <style>...</style> if the source page uses external CSS.
 */
export function importProfileFromHtml(rawInput: string, sourceUrl?: string): ImportResult {
  const { clean, scriptsRemoved } = sanitizeHtml(rawInput);

  // Wrap fragments in <html><body> so DOMParser handles snippets gracefully.
  const wrapped = /<html[\s>]/i.test(clean)
    ? clean
    : `<!doctype html><html><head></head><body>${clean}</body></html>`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(wrapped, 'text/html');

  assertGaiaV2DefaultLayout(doc);

  // If the user provided a source URL, rewrite relative URLs so images resolve
  if (sourceUrl) {
    try {
      rewriteRelativeUrls(doc, sourceUrl);
    } catch {
      /* ignore */
    }
  }

  injectBbIds(doc);

  // Only inline styles are accessible when pasting; skip external <link> stylesheets.
  const cssBlocks: string[] = [];
  doc.querySelectorAll('style').forEach((s) => {
    if (s.textContent) cssBlocks.push(sourceUrl ? rewriteCssUrls(s.textContent, sourceUrl) : s.textContent);
  });
  const rawCss = withGaiaPanelBaseCss(doc, cssBlocks.join('\n\n'));

  const { elements, settings } = reconstructElements(doc, rawCss);

  return {
    elements,
    settings,
    rawHtml: serializeDoc(doc, rawCss),
    rawCss,
    scriptsRemoved,
    sourceUrl: sourceUrl || '(pasted HTML)',
  };
}
