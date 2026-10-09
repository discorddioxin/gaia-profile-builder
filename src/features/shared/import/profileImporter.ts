import { ProfileElement, CanvasSettings } from '../../../types/profile';
import { CLIP_PRESETS } from '../../../utils/presets';
import { extractCanonicalUrl } from './importFile';
import {
  BackgroundSnapshot,
  ProbedBackground,
  StylesheetRecord,
  classifyStylesheet,
  probeRenderedBackground,
  resolveCssImports,
  rewriteCssAssetUrls,
  rewriteImportTargets,
  snapshotDeclarations,
} from '../../../utils/cssFidelity';
import {
  GAIA_COMPONENT_ROOT_SELECTOR,
  createGaiaPanelElement,
  detectGaiaComponentKind,
  getGaiaComponent,
  isGaiaComponentKind,
  xForColumn,
} from '../../../utils/gaiaSpec';
import { GAIA_V2_DEFAULT_CSS } from '../../../utils/gaiaDefaults';

/** Background resolved from the profile's CSS/inline styles (style, not <img>). */
export interface DetectedBackground {
  detected: boolean;
  color?: string;
  image?: string;
  repeat?: string;
  size?: string;
  position?: string;
  attachment?: string;
  /** Full multi-layer `background-image` value (gradients included). */
  imageLayers?: string;
  /** Computed reproduction of the real page surface, per root element. */
  computed?: {
    html?: BackgroundSnapshot | null;
    body?: BackgroundSnapshot | null;
  };
  /** True when the values came from the browser's own computed styles. */
  verified?: boolean;
  /** Human readable origin, e.g. `body CSS rule (linked stylesheet)`. */
  source: string;
}

export interface ImportDiagnostics {
  stylesheetsFound: number;
  stylesheetsFetched: number;
  /** Every sheet in the profile's CSS chain (links, imports, third-party libs). */
  stylesheetUrls: StylesheetRecord[];
  /** Bytes of CSS inlined into the document (links + @imports + <style>). */
  cssBytesInlined: number;
  /** `true` when the browser probe confirmed the rendered background. */
  backgroundVerified: boolean;
  background: DetectedBackground;
  components: Array<{
    kind: string;
    label: string;
    count: number;
    columns: number[];
    panelIds: string[];
  }>;
  warnings: string[];
}

export interface ImportResult {
  elements: ProfileElement[];
  settings: Partial<CanvasSettings>;
  rawHtml: string;
  rawCss: string;
  scriptsRemoved: number;
  sourceUrl: string;
  diagnostics: ImportDiagnostics;
}

const V2_UNSUPPORTED_MESSAGE =
  'Only V2 profiles supported. The imported HTML must include #columns with #column_1, #column_2, and #column_3.';

/**
 * CORS relay endpoints, in the order they are tried. Each entry knows how to
 * build its URL and how to unwrap its response (AllOrigins' `/get` route wraps
 * the page in JSON).
 */
const CORS_PROXIES: Array<{
  label: string;
  build: (url: string) => string;
  /** Extra fetch init (method/body/headers) for this relay's request shape. */
  init?: (url: string) => RequestInit;
  /** Per-relay attempt budget; defaults to the caller's timeout. */
  timeoutMs?: number;
  /** Page fetches only — skipped for stylesheets (rate limits, no benefit). */
  pagesOnly?: boolean;
  unwrap?: (body: string) => string;
}> = [
  {
    // A real headless browser: it executes Gaia's AWS WAF challenge script,
    // so it reads pages the plain relays only ever see as a bot-check page.
    label: 'Jina reader (rendered)',
    build: (url) => `https://r.jina.ai/${url}`,
    init: () => ({ headers: { 'X-Return-Format': 'html' } }),
    timeoutMs: 45000,
    pagesOnly: true,
  },
  {
    // Preflight-free shape: a form-urlencoded POST is a CORS simple request,
    // so this works even when the browser rejects the custom header above.
    label: 'Jina reader (POST)',
    build: () => 'https://r.jina.ai/',
    init: (url) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(url)}&returnFormat=html&respondWith=html`,
    }),
    timeoutMs: 45000,
    pagesOnly: true,
  },
  {
    label: 'AllOrigins',
    build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    label: 'corsproxy.io',
    build: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  },
  {
    label: 'codetabs',
    build: (url) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  },
  {
    label: 'cors.lol',
    build: (url) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  },
  {
    label: 'AllOrigins (JSON)',
    build: (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    unwrap: (body) => {
      try {
        return String(JSON.parse(body)?.contents ?? '');
      } catch {
        return '';
      }
    },
  },
];

/** Responses that are really a proxy/gateway error page, not the profile. */
const ERROR_BODY_MARKERS = [
  /error:\s*network connection lost/i,
  /upstream connect error/i,
  /<title>\s*just a moment/i,
  /cf-error-details/i,
  /<title>\s*429 too many requests/i,
  /request blocked by/i,
  /awswafintegration/i,
  /we need to verify that you'?re not a robot/i,
];

/**
 * Gaia Online answers server-side fetchers with an AWS WAF interstitial
 * ("verify that you're not a robot"), not the profile. Recognizing it keeps
 * the error honest instead of reporting a generic unusable response.
 */
const AWS_WAF_MARKERS = [/awswafintegration/i, /we need to verify that you'?re not a robot/i];

/** Gaia's stock V2 stylesheet chain on the CDN (version query ignored). */
const GAIA_V2_SHEET_RE = /\/src\/css\/profiles\/v2\/[a-z_]+\.css/i;

/** Cheap quality gate: is this plausibly a page body? */
function isUsableHtml(body: string): boolean {
  if (!body || body.length < 500) return false;
  if (!/<html|<!doctype|<body|<div/i.test(body)) return false;
  return !ERROR_BODY_MARKERS.some((marker) => marker.test(body));
}

/** A Gaia V2 profile always ships the `#columns` shell. */
function looksLikeV2Profile(body: string): boolean {
  return /id\s*=\s*["']?columns\b/i.test(body);
}

/** A stylesheet body: non-trivial text that is not a gateway error page. */
function isUsableStylesheet(body: string): boolean {
  if (!body || body.trim().length < 24) return false;
  return !ERROR_BODY_MARKERS.some((marker) => marker.test(body));
}

/** Sleep helper for slow-loading pages */
export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface FetchHtmlOptions {
  /** Cancels the fetch (dialog Cancel / close). */
  signal?: AbortSignal;
  /** Per-attempt budget. A hung proxy fails here instead of blocking forever. */
  timeoutMs?: number;
  /**
   * What the caller expects back. Pages must look like HTML (and a V2 profile
   * must carry `#columns`); stylesheets only need to be non-empty text.
   */
  accept?: 'html' | 'stylesheet';
}

/** Raised when the caller cancelled the import. */
export class ImportAbortedError extends Error {
  constructor() {
    super('Import cancelled.');
    this.name = 'ImportAbortedError';
  }
}

/** One fetch attempt with its own timeout, linked to the caller's signal. */
async function fetchOnce(
  url: string,
  timeoutMs: number,
  outerSignal?: AbortSignal,
  init?: RequestInit
): Promise<string> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  outerSignal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { mode: 'cors', ...init, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (error) {
    if (outerSignal?.aborted) throw new ImportAbortedError();
    if (controller.signal.aborted) throw new Error(`timed out after ${Math.round(timeoutMs / 1000)}s`);
    throw error;
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Fetch a page's HTML through the first source that actually returns a profile.
 *
 * Direct → CORS relays, started with a small stagger and raced: the first
 * response that contains the V2 `#columns` shell wins, so a slow or hanging
 * relay can't hold the import hostage. A usable-but-unverified body is kept as
 * a fallback in case no source returns the real page.
 */
export async function fetchProfileHtml(
  url: string,
  onProgress?: (msg: string) => void,
  options: FetchHtmlOptions = {}
): Promise<string> {
  const { signal, timeoutMs = 20000, accept = 'html' } = options;
  if (signal?.aborted) throw new ImportAbortedError();
  const wantsStylesheet = accept === 'stylesheet';

  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  const attempts: Array<{
    label: string;
    budget: number;
    run: (timeout: number) => Promise<string>;
  }> = [
    { label: 'direct connection', budget: timeoutMs, run: (timeout) => fetchOnce(url, timeout, signal) },
    // The browser-rendering reader only helps pages: stylesheets neither need
    // JS execution nor survive it (and Gaia's CDN hotlink-blocks the reader).
    ...CORS_PROXIES.filter((proxy) => !proxy.pagesOnly || !wantsStylesheet).map((proxy) => ({
      label: proxy.label,
      budget: proxy.timeoutMs ?? timeoutMs,
      run: async (timeout: number) => {
        const body = await fetchOnce(proxy.build(url), timeout, signal, proxy.init?.(url));
        return proxy.unwrap ? proxy.unwrap(body) : body;
      },
    })),
  ];

  onProgress?.(
    `Fetching ${host} — direct, CORS relays, and a browser-rendering reader for bot-checked pages…`
  );

  return new Promise<string>((resolve, reject) => {
    let pending = attempts.length;
    let fallback = '';
    let fallbackLabel = '';
    let sawBotCheck = false;
    const errors: string[] = [];

    const finish = () => {
      if (fallback) {
        onProgress?.(`Loaded via ${fallbackLabel} (unverified) (${(fallback.length / 1024).toFixed(1)}KB)`);
        resolve(fallback);
        return;
      }
      const isGaia = /gaiaonline\.com|gaia\.online/i.test(host);
      const reason = sawBotCheck
        ? 'Gaia Online answered the plain relays with a bot-check page (AWS WAF), and the browser-rendering reader did not get through either — it is rate-limited to about 20 reads a minute, so wait a minute and retry.'
        : isGaia
          ? 'Gaia profiles are protected by a bot check, and the public relays may also be down or rate-limited.'
          : 'The site blocked the fetch, or every public CORS relay is down or rate-limited right now.';
      reject(
        new Error(
          wantsStylesheet
            ? `Could not fetch the stylesheet from ${host}. ${reason} Attempts:\n${errors.join('\n')}`
            : `Could not fetch ${host}. ${reason}\n\nThe reliable route: open the profile in your browser, save it (Ctrl/⌘+S → "Webpage, HTML only") and load that file below — it works without the relays. Attempts:\n${errors.join('\n')}`
        )
      );
    };

    attempts.forEach((attempt, index) => {
      const start = () =>
        attempt
          .run(attempt.budget)
          .then((body) => {
            if (wantsStylesheet) {
              if (AWS_WAF_MARKERS.some((marker) => marker.test(body))) {
                sawBotCheck = true;
                errors.push(`${attempt.label}: bot-check page (AWS WAF)`);
              } else if (isUsableStylesheet(body)) resolve(body);
              else errors.push(`${attempt.label}: unusable stylesheet`);
              return;
            }
            if (looksLikeV2Profile(body)) {
              onProgress?.(`Loaded via ${attempt.label} (${(body.length / 1024).toFixed(1)}KB)`);
              resolve(body);
              return;
            }
            if (AWS_WAF_MARKERS.some((marker) => marker.test(body))) {
              sawBotCheck = true;
              errors.push(`${attempt.label}: bot-check page (AWS WAF)`);
              return;
            }
            if (isUsableHtml(body)) {
              if (!fallback) {
                fallback = body;
                fallbackLabel = attempt.label;
              }
              onProgress?.(`${attempt.label} returned a page without #columns — keeping it as a fallback`);
            } else {
              errors.push(`${attempt.label}: unusable response`);
            }
          })
          .catch((error: unknown) => {
            if (error instanceof ImportAbortedError) {
              reject(error);
              return;
            }
            errors.push(`${attempt.label}: ${error instanceof Error ? error.message : String(error)}`);
            onProgress?.(`${attempt.label} failed — trying the next source…`);
          })
          .finally(() => {
            pending -= 1;
            if (pending === 0) finish();
          });

      // Stagger the relay requests slightly; the direct attempt goes first.
      window.setTimeout(start, index * 200);
    });
  });
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

/* -------------------------------------------------------------------------- */
/* Background scraping                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Gaia profiles frequently paint their surface with CSS instead of an <img>:
 *
 *   body { background: #000 url(/bg/starfield.png) no-repeat fixed center; }
 *   <body style="background-image:url(...)">   ← inline style
 *   <body background="/bg/old_school.gif">     ← legacy attribute
 *
 * This walks every place a background can hide and returns one resolved value
 * so the editor can always render it (even inside the shadow DOM).
 */
export function detectProfileBackground(
  doc: Document,
  css: string,
  baseUrl: string
): DetectedBackground {
  const result: DetectedBackground = { detected: false, source: 'not found' };
  const decls: Record<string, string> = {};
  const sources: string[] = [];

  const applyDeclarations = (block: Record<string, string>, source: string) => {
    const mapped: Record<string, string> = {};
    if (block['background']) {
      const shorthand = expandBackgroundShorthand(block['background'], baseUrl);
      Object.assign(mapped, shorthand);
    }
    if (block['background-color']) mapped['background-color'] = block['background-color'];
    if (block['background-image']) mapped['background-image'] = block['background-image'];
    if (block['background-repeat']) mapped['background-repeat'] = block['background-repeat'];
    if (block['background-size']) mapped['background-size'] = block['background-size'];
    if (block['background-position']) mapped['background-position'] = block['background-position'];
    if (block['background-attachment']) mapped['background-attachment'] = block['background-attachment'];
    if (Object.keys(mapped).length === 0) return;
    Object.assign(decls, mapped);
    sources.push(source);
  };

  // 1) CSS rules that style the page surface.
  const rootSelectors = new Set(['html', 'body', '#viewer', 'html body', 'body#viewer', '*']);
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(cssNoComments)) !== null) {
    const selectors = match[1]
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!selectors.some((selector) => rootSelectors.has(selector))) continue;
    applyDeclarations(parseInlineStyle(match[2]), `CSS rule (${selectors.join(', ')})`);
  }

  // 2) Inline styles on <html>, <body>, #viewer.
  const roots: Array<[string, Element | null]> = [
    ['<html> inline style', doc.documentElement],
    ['<body> inline style', doc.body],
    ['#viewer inline style', doc.getElementById('viewer')],
  ];
  roots.forEach(([label, el]) => {
    if (!el) return;
    const styleAttr = el.getAttribute('style');
    if (styleAttr) applyDeclarations(parseInlineStyle(rewriteCssUrls(styleAttr, baseUrl)), label);
  });

  // 3) Legacy `background="..."` attribute (style, not <img>).
  roots.forEach(([label, el]) => {
    if (!el) return;
    const legacy = el.getAttribute('background');
    if (legacy) {
      const absolute = safeAbsoluteUrl(legacy, baseUrl);
      decls['background-image'] = `url('${absolute}')`;
      sources.push(`${label.replace('inline style', 'background attribute')}`);
    }
  });

  const image = normalizeBackgroundImage(decls['background-image']);
  const color = decls['background-color'] && !/^transparent$/i.test(decls['background-color'])
    ? decls['background-color']
    : undefined;

  if (image || color) {
    result.detected = true;
    result.image = image;
    result.color = color;
    result.repeat = decls['background-repeat'];
    result.size = decls['background-size'];
    result.position = decls['background-position'];
    result.attachment = decls['background-attachment'];
    result.source = sources.length ? sources.join(' + ') : 'detected style';
  }

  return result;
}

/** `url("x")` → `x`; `none` → undefined. */
function normalizeBackgroundImage(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^none$/i.test(value.trim())) return undefined;
  const url = value.match(/url\(\s*(['"]?)([^'")]+)\1\s*\)/i);
  return url ? url[2].trim() : undefined;
}

/**
 * Expand `background: #000 url(x) no-repeat fixed center` using the browser's
 * own parser (works for any valid shorthand, including gradients).
 */
function expandBackgroundShorthand(value: string, baseUrl: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const probe = document.createElement('div');
    probe.style.background = rewriteCssUrls(value, baseUrl);
    const style = probe.style;
    if (style.backgroundColor) out['background-color'] = style.backgroundColor;
    if (style.backgroundImage) out['background-image'] = style.backgroundImage;
    if (style.backgroundRepeat) out['background-repeat'] = style.backgroundRepeat;
    if (style.backgroundSize) out['background-size'] = style.backgroundSize;
    if (style.backgroundPosition) out['background-position'] = style.backgroundPosition;
    if (style.backgroundAttachment) out['background-attachment'] = style.backgroundAttachment;
  } catch {
    /* fall through — malformed shorthand is ignored */
  }
  return out;
}

function safeAbsoluteUrl(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

/**
 * Append a clearly-marked surface rule so the background renders even when the
 * original selector cannot match inside the editor (shadow DOM) or when the
 * linked stylesheet could not be fetched.
 */
export function augmentCssWithBackground(css: string, background: DetectedBackground): string {
  if (!background.detected) return css;

  // A verified page may paint both html and body intentionally. Re-emitting the
  // computed values as extra rules duplicates the image layers and changes the
  // browser's canvas/body background propagation. Preserve the source CSS as-is;
  // the editor's canvas surface fallback handles only genuinely missing paint.
  if (background.verified) return css;

  const header = [
    '/* ------------------------------------------------------------------',
    '   Profile surface reproduced by BBStudio import',
    `   Source: ${background.source}`,
    background.verified
      ? '   Values: read from the browser after applying the profile CSS (1:1)'
      : '   Values: parsed from the profile CSS',
    '   Written at zero specificity so the profile CSS always wins.',
    '   Applied to html/body so the surface renders in the editor too.',
    '   Safe to delete if your profile already paints its own surface.',
    '   ------------------------------------------------------------------ */',
  ];

  const rules: string[] = [];
  const html = background.computed?.html;
  const body = background.computed?.body;

  if (html && (html.image !== 'none' || !/^transparent$/i.test(html.color))) {
    rules.push(`:where(html) {\n${snapshotDeclarations(html)}\n}`);
  }
  if (body && (body.image !== 'none' || !/^transparent$/i.test(body.color))) {
    rules.push(`:where(body) {\n${snapshotDeclarations(body)}\n}`);
  }

  if (rules.length === 0) {
    // Textual fallback (no browser probe available).
    const declarations = [
      `  background-color: ${background.color || 'transparent'};`,
      background.imageLayers
        ? `  background-image: ${background.imageLayers};`
        : `  background-image: ${background.image ? `url('${background.image}')` : 'none'};`,
      background.repeat ? `  background-repeat: ${background.repeat};` : '',
      background.size ? `  background-size: ${background.size};` : '',
      `  background-position: ${background.position || 'center top'};`,
      `  background-attachment: ${background.attachment || 'scroll'};`,
    ].filter(Boolean);
    rules.push(`:where(html, body, body#viewer) {\n${declarations.join('\n')}\n}`);
  }

  return `${css}\n\n${header.join('\n')}\n${rules.join('\n\n')}`;
}

/** Merge the browser's computed surface into the textually detected background. */
function mergeProbedBackground(
  detected: DetectedBackground,
  probed: ProbedBackground | null
): DetectedBackground {
  if (!probed || !probed.paints) return detected;

  const primary = probed.body && probed.origin === 'body' ? probed.body : probed.html || probed.body;
  const urlMatch = primary?.image?.match(/url\(\s*(['"]?)([^'")]+)\1\s*\)/i);
  const firstUrl = urlMatch ? urlMatch[2].trim() : undefined;

  return {
    ...detected,
    detected: true,
    verified: true,
    color: primary && !/^transparent$/i.test(primary.color) ? primary.color : detected.color,
    image: firstUrl || detected.image,
    imageLayers: primary && primary.image !== 'none' ? primary.image : detected.imageLayers,
    repeat: primary?.repeat || detected.repeat,
    size: primary?.size || detected.size,
    position: primary?.position || detected.position,
    attachment: primary?.attachment || detected.attachment,
    computed: { html: probed.html, body: probed.body },
    source: `${detected.detected ? detected.source : 'rendered surface'} (verified by browser: ${probed.origin})`,
  };
}

/* -------------------------------------------------------------------------- */
/* Component scraping                                                          */
/* -------------------------------------------------------------------------- */

function scrapeGaiaComponents(doc: Document): ImportDiagnostics['components'] {
  const map = new Map<string, { kind: string; label: string; count: number; columns: number[]; panelIds: string[] }>();
  const roots = Array.from(doc.querySelectorAll(GAIA_COMPONENT_ROOT_SELECTOR));

  roots.forEach((el) => {
    // Skip nested roots — the outermost panel is the component.
    if (roots.some((other) => other !== el && other.contains(el))) return;
    const kind = detectGaiaComponentKind(el);
    if (!kind) return;
    const def = getGaiaComponent(kind);
    const columnEl = el.closest('[id^="column_"]');
    const column = columnEl ? Number((columnEl.getAttribute('id') || '').replace('column_', '')) : 0;
    const entry = map.get(kind) || {
      kind,
      label: def.label,
      count: 0,
      columns: [] as number[],
      panelIds: [] as string[],
    };
    entry.count += 1;
    const panelId = el.getAttribute('id') || (kind === 'custom' ? 'id_custom_####' : `#${kind}`);
    if (!entry.panelIds.includes(panelId)) entry.panelIds.push(panelId);
    if (column && !entry.columns.includes(column)) entry.columns.push(column);
    map.set(kind, entry);
  });

  return Array.from(map.values());
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
export async function extractCss(
  doc: Document,
  baseUrl: string,
  onProgress?: (msg: string) => void,
  options: FetchHtmlOptions = {}
): Promise<{ css: string; stylesheets: StylesheetRecord[]; warnings: string[] }> {
  const blocks: string[] = [];
  const stylesheets: StylesheetRecord[] = [];
  const warnings: string[] = [];
  let bundledGaiaCssUsed = false;

  /** Fetch a sheet the same way pages are fetched: direct, then CORS proxies. */
  const fetchCss = async (url: string): Promise<string> => {
    const text = await fetchProfileHtml(url, undefined, {
      ...options,
      accept: 'stylesheet',
      timeoutMs: options.timeoutMs ?? 15000,
    });
    if (!text.trim()) throw new Error('empty stylesheet');
    return text;
  };

  /** Inline one <link> sheet. Returns the block, or null when nothing is added. */
  const inlineLinkedSheet = async (el: HTMLLinkElement): Promise<string | null> => {
    const href = el.getAttribute('href');
    if (!href) return null;
    let absolute = href;
    try {
      absolute = new URL(href, baseUrl).toString();
    } catch {
      /* keep as written */
    }
    const meta = classifyStylesheet(absolute);
    const label = meta.label ? ` (${meta.label})` : '';
    try {
      const raw = await fetchCss(absolute);
      // Resolve nested @imports in place so the sheet is standalone.
      const resolved = await resolveCssImports(raw, absolute, fetchCss, {
        depth: 3,
        onProgress,
      });
      const withUrls = rewriteCssAssetUrls(resolved.css, absolute);
      stylesheets.push({
        url: absolute,
        ok: true,
        from: 'link',
        kind: meta.kind,
        label: meta.label,
        bytes: raw.length,
      });
      stylesheets.push(...resolved.imports);
      onProgress?.(
        `Linked stylesheet inlined${label} (${(raw.length / 1024).toFixed(1)}KB): ${absolute}`
      );
      return `/* ------------------------------------------------------------------\n   From <link rel="stylesheet" href="${absolute}">${label}\n   ------------------------------------------------------------------ */\n${withUrls}`;
    } catch {
      stylesheets.push({
        url: absolute,
        ok: false,
        from: 'link',
        kind: meta.kind,
        label: meta.label,
      });
      // Gaia's stock V2 sheets are known: splice the bundled copy in once so
      // the CSS read-out and column measuring still work when every relay is
      // down. The preview keeps the original <link>, and the browser loads
      // stylesheets cross-origin without CORS, so rendering is unaffected.
      if (GAIA_V2_SHEET_RE.test(absolute)) {
        if (!bundledGaiaCssUsed) {
          bundledGaiaCssUsed = true;
          warnings.push(
            `Gaia's stock V2 stylesheet(s) could not be fetched (relays unavailable) — the bundled stock V2 CSS was spliced in for the CSS read-out; the preview loads the originals directly.`
          );
          onProgress?.(`Relay unavailable — using the bundled Gaia stock V2 CSS for ${absolute}`);
          return `/* ------------------------------------------------------------------\n   Gaia stock V2 CSS — bundled fallback (relay unavailable for ${absolute})\n   The preview still loads the original <link> directly.\n   ------------------------------------------------------------------ */\n${GAIA_V2_DEFAULT_CSS}`;
        }
        return `/* ${absolute} — not fetched (bundled Gaia stock V2 CSS already inlined above) */`;
      }
      onProgress?.(`Stylesheet blocked${label}: ${absolute}`);
      return null;
    }
  };

  /**
   * Inline a <style> block, resolving any `@import` inside it.
   *
   * Chrome ignores `@import` inside a shadow root stylesheet, and the sandboxed
   * preview iframe may not be allowed to load the linked sheet either — so the
   * imported text is spliced in place. Cascade order is preserved because
   * `@import` is only valid at the top of a stylesheet (nested rules keep their
   * position inside enclosing `@media`/`@supports` blocks).
   */
  const pushStyleNode = async (
    el: HTMLStyleElement | Element,
    source: string
  ): Promise<string | null> => {
    const text = el.textContent;
    if (!text || !text.trim()) return null;
    if (!/^\s*@import\b/m.test(text)) {
      return `/* From ${source} */\n${rewriteImportTargets(rewriteCssAssetUrls(text, baseUrl), baseUrl)}`;
    }
    const resolved = await resolveCssImports(text, baseUrl, fetchCss, {
      depth: 3,
      onProgress,
    });
    const withUrls = rewriteImportTargets(rewriteCssAssetUrls(resolved.css, baseUrl), baseUrl);
    if (resolved.imports.length) {
      stylesheets.push(...resolved.imports);
      onProgress?.(
        `Resolved ${resolved.imports.length} @import(s) from ${source}: ${resolved.imports
          .map((i) => `${i.url}${i.ok ? '' : ' (blocked)'}`)
          .join(', ')}`
      );
    }
    return `/* From ${source} */\n${withUrls}`;
  };

  // <head> in document order — link → style → inline, exactly as authored.
  // Sheets are fetched concurrently (a dead relay then costs one timeout
  // window, not one per sheet) while the blocks keep their authored order.
  const headNodes = Array.from(doc.head?.childNodes || []);
  const headTasks: Array<Promise<void>> = [];
  const orderedBlocks: Array<string | null> = [];
  for (const node of headNodes) {
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as HTMLElement;
    let task: Promise<string | null> | null = null;
    if (el.tagName === 'STYLE') {
      task = pushStyleNode(el, '<style> in <head>');
    } else if (el.tagName === 'LINK' && (el as HTMLLinkElement).rel === 'stylesheet') {
      task = inlineLinkedSheet(el as HTMLLinkElement);
    }
    if (task) {
      const slot = orderedBlocks.length;
      orderedBlocks.push(null);
      headTasks.push(task.then((block) => void (orderedBlocks[slot] = block)));
    }
  }
  await Promise.all(headTasks);
  orderedBlocks.forEach((block) => {
    if (block) blocks.push(block);
  });

  // Some profiles keep <style> blocks in the body (inside #columns or panels).
  for (const styleEl of Array.from(doc.body?.querySelectorAll('style') || [])) {
    const block = await pushStyleNode(styleEl, '<style> in <body>');
    if (block) blocks.push(block);
  }

  const css = withGaiaPanelBaseCss(doc, blocks.join('\n\n'));

  // Surface third-party libraries in the report even when they could not be
  // fetched (the browser will still try the original <link> at render time).
  const libraries = new Map<string, number>();
  stylesheets.forEach((sheet) => {
    if (!sheet.label) return;
    libraries.set(sheet.label, (libraries.get(sheet.label) || 0) + 1);
  });
  if (libraries.size) {
    onProgress?.(
      `CSS libraries detected: ${Array.from(libraries.entries())
        .map(([name, count]) => `${name}×${count}`)
        .join(', ')}`
    );
  }

  return { css, stylesheets, warnings };
}

/** Absolutize CSS asset URLs (delegates to the fidelity module). */
function rewriteCssUrls(css: string, baseUrl: string): string {
  return rewriteCssAssetUrls(css, baseUrl);
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

  // 0) Gaia V2 path — every dedicated component becomes a first-class
  //    `gaia-panel` element so the editor styles it with Gaia-supported
  //    selectors instead of guessing at freeform boxes.
  const gaiaPanels = buildGaiaPanelElements(doc);
  if (gaiaPanels.length > 0) {
    const panelDomNodes = Array.from(doc.querySelectorAll(GAIA_COMPONENT_ROOT_SELECTOR));
    const markerSpans = Array.from(
      doc.querySelectorAll('span[style*="color: #"], span[style*="color:#"]')
    ).filter((span) => !panelDomNodes.some((panel) => panel.contains(span))) as HTMLElement[];

    const leftovers: ProfileElement[] = [];
    markerSpans.forEach((span, idx) => {
      const styleAttr = span.getAttribute('style') || '';
      if (!/color\s*:\s*#\d+\b/i.test(styleAttr)) return;
      const markerMatch = styleAttr.match(/color\s*:\s*(#\d+)/i);
      const el = buildElementFromSpan(span, markerMatch ? markerMatch[1] : `#${idx + 1}`, rules, idx);
      if (el) leftovers.push(el);
    });

    return { elements: [...gaiaPanels, ...leftovers], settings };
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

/**
 * Convert every Gaia V2 panel in the document into a `gaia-panel` element.
 * This keeps the editor aligned with the spec: Comments stay Comments, Friends
 * stay Friends, and code generation can target the real panel classes.
 */
function buildGaiaPanelElements(doc: Document): ProfileElement[] {
  const roots = Array.from(doc.querySelectorAll(GAIA_COMPONENT_ROOT_SELECTOR)).filter(
    (el) => !el.getAttribute('data-bb-skip-component')
  );
  // Keep only outermost component roots (ignore nested markup inside a panel).
  const outerRoots = roots.filter((el) => !roots.some((other) => other !== el && other.contains(el)));

  const columnCursor = new Map<number, number>();
  const panelCounts = new Map<string, number>();

  return outerRoots
    .map((root, idx) => {
      const kind = detectGaiaComponentKind(root);
      if (!kind || !isGaiaComponentKind(kind)) return null;
      const def = getGaiaComponent(kind);
      panelCounts.set(kind, (panelCounts.get(kind) || 0) + 1);

      const columnEl = root.closest('[id^="column_"]');
      const columnAttr = columnEl ? (columnEl.getAttribute('id') || '').replace('column_', '') : '';
      const parsedColumn = Number(columnAttr);
      const column: 1 | 2 | 3 = parsedColumn === 2 ? 2 : parsedColumn === 3 ? 3 : def.defaultColumn;

      const h2 = root.querySelector('h2');
      const title = (h2?.textContent || '').trim() || def.defaultTitle;

      // Body HTML = component markup minus the heading (the editor re-emits the h2).
      const clone = root.cloneNode(true) as HTMLElement;
      clone.querySelector('h2')?.remove();
      const bodyHtml = clone.innerHTML.trim();

      const element = createGaiaPanelElement(kind, column, idx, {
        width: 1380,
        height: 720,
        backgroundColor: '#0e111a',
        gridSnap: true,
        gridSize: 10,
        showGrid: false,
        profileTitle: 'Imported',
        forumTheme: 'dark-cyber',
      } as CanvasSettings);

      const y = 24 + (columnCursor.get(column) || 0) * 24;
      columnCursor.set(column, (columnCursor.get(column) || 0) + 1);

      const inlineStyle = root.getAttribute('style') || '';

      return {
        ...element,
        id: `imported_gaia_${kind}_${idx}`,
        name: `${def.label} (${def.panelClass.split(' ')[0]})`,
        content: title,
        x: xForColumn(
          { width: 1380 } as CanvasSettings,
          column,
          element.width
        ),
        y,
        width: parsePx(inlineStyle.match(/width\s*:\s*([^;]+)/)?.[1], element.width),
        height: Math.max(160, parsePx(inlineStyle.match(/height\s*:\s*([^;]+)/)?.[1], element.height)),
        gaia: {
          kind,
          column,
          title,
          panelId: root.getAttribute('id') || def.panelId || undefined,
          extraClass: undefined,
          bodyHtml,
        },
      } as ProfileElement;
    })
    .filter((el): el is ProfileElement => !!el);
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

/** Top-level: fetch URL, sanitize, parse, scrape styles/background, reconstruct. */
export async function importProfileFromUrl(
  url: string,
  onProgress?: (msg: string) => void,
  options: FetchHtmlOptions = {}
): Promise<ImportResult> {
  onProgress?.('Fetching page…');
  const rawHtml = await fetchProfileHtml(url, onProgress, options);

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
  const { css: importedCss, stylesheets, warnings: cssWarnings } = await extractCss(
    doc,
    url,
    onProgress,
    options
  );

  // The profile background is usually CSS (body/html rule) rather than an <img>.
  let background = detectProfileBackground(doc, importedCss, url);
  onProgress?.(
    background.detected
      ? `Background found (${background.source})`
      : 'No CSS background found — checking components…'
  );

  // Render the imported document once in a hidden frame and read the computed
  // surface, so the recorded background is exactly what the profile shows.
  onProgress?.('Verifying rendered background…');
  const probed = await probeRenderedBackground(serializeDoc(doc, importedCss), {
    timeoutMs: 9000,
  });
  background = mergeProbedBackground(background, probed);
  if (probed?.paints) {
    onProgress?.(`Background verified from rendered page (${probed.origin})`);
  }

  const rawCss = augmentCssWithBackground(importedCss, background);

  // Small settle delay — some pages benefit from a moment of yield before extraction
  await sleep(150);

  onProgress?.('Scraping Gaia V2 components…');
  const components = scrapeGaiaComponents(doc);
  onProgress?.(
    components.length
      ? `Components: ${components.map((c) => `${c.label}×${c.count}`).join(', ')}`
      : 'No dedicated components detected'
  );

  onProgress?.('Reconstructing elements…');
  const { elements, settings } = reconstructElements(doc, rawCss);

  const mergedSettings: Partial<CanvasSettings> = {
    ...settings,
    ...backgroundToSettings(background),
  };

  const warnings: string[] = [...cssWarnings];
  const failed = stylesheets.filter((s) => !s.ok);
  if (failed.length) {
    warnings.push(
      `${failed.length} stylesheet(s) could not be fetched (CORS/login) — the browser will still request the original <link> at render time: ${failed
        .map((s) => `${s.url}${s.label ? ` [${s.label}]` : ''}`)
        .join(', ')}`
    );
  }
  if (!background.detected) {
    warnings.push('No background style found in the document — the profile may use an image element instead.');
  } else if (!background.verified) {
    warnings.push(
      'The rendered-background check could not run in this browser — the background falls back to the parsed CSS values.'
    );
  }
  if (components.length === 0) {
    warnings.push('No Gaia V2 panels detected inside #columns.');
  }

  onProgress?.(`Done — ${elements.length} elements, ${components.length} components, ${scriptsRemoved} scripts removed`);

  return {
    elements,
    settings: mergedSettings,
    rawHtml: serializeDoc(doc, rawCss),
    rawCss,
    scriptsRemoved,
    sourceUrl: url,
    diagnostics: {
      stylesheetsFound: stylesheets.length,
      stylesheetsFetched: stylesheets.filter((s) => s.ok).length,
      stylesheetUrls: stylesheets,
      cssBytesInlined: rawCss.length,
      backgroundVerified: !!background.verified,
      background,
      components,
      warnings,
    },
  };
}

function backgroundToSettings(background: DetectedBackground): Partial<CanvasSettings> {
  if (!background.detected) return {};
  const out: Partial<CanvasSettings> = {};
  if (background.verified) out.backgroundVerified = true;
  if (background.color) out.backgroundColor = background.color;
  if (background.image) out.backgroundImage = background.image;
  // Exact multi-layer value (gradients + multiple urls), used by the editor and
  // the exporter so the surface rule matches the imported profile byte for byte.
  if (background.imageLayers) out.backgroundImageLayers = background.imageLayers;
  if (background.repeat) out.backgroundRepeat = background.repeat;
  if (background.size) out.backgroundSize = background.size;
  if (background.position) out.backgroundPosition = background.position;
  if (background.attachment) out.backgroundAttachment = background.attachment;
  return out;
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
    ['link', 'href'],
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
  // Ensure a single <base> tag exists so any remaining relative refs resolve.
  doc.querySelectorAll('base').forEach((existing) => existing.remove());
  if (doc.head) {
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
 * Import from a raw HTML string pasted by the user (view-source → paste).
 *
 * When a source URL is supplied we also try to fetch the `<link rel="stylesheet">`
 * documents listed in <head> through the CORS proxy chain — that is where Gaia
 * keeps the real profile styling and the `body { background: url(...) }` rule.
 */
export async function importProfileFromHtml(
  rawInput: string,
  sourceUrl?: string,
  onProgress?: (msg: string) => void,
  options: FetchHtmlOptions = {}
): Promise<ImportResult> {
  const { clean, scriptsRemoved } = sanitizeHtml(rawInput);

  // Wrap fragments in <html><body> so DOMParser handles snippets gracefully.
  const wrapped = /<html[\s>]/i.test(clean)
    ? clean
    : `<!doctype html><html><head></head><body>${clean}</body></html>`;

  const parser = new DOMParser();
  const doc = parser.parseFromString(wrapped, 'text/html');

  assertGaiaV2DefaultLayout(doc);

  // A saved page carries its own URL (`<link rel=canonical>`, og:url), so a file
  // dropped in without a source URL can still resolve its whole CSS chain and
  // relative images.
  const canonical = sourceUrl ? null : extractCanonicalUrl(clean);
  const base = sourceUrl || canonical || '';

  // If we have a base URL, rewrite relative URLs so images resolve
  if (base) {
    try {
      rewriteRelativeUrls(doc, base);
    } catch {
      /* ignore */
    }
  }

  // Stamp nodes BEFORE fetching linked CSS (fetch does not mutate the DOM).
  injectBbIds(doc);

  const stylesheets: StylesheetRecord[] = [];
  let importedCss = '';

  let cssChainWarnings: string[] = [];
  if (base) {
    onProgress?.('Resolving the profile CSS chain (links, @imports, libraries)…');
    const linked = await extractCss(doc, base, onProgress, options);
    importedCss = linked.css;
    cssChainWarnings = linked.warnings;
    stylesheets.push(...linked.stylesheets);
  } else {
    // No source URL: <link> and @import targets cannot be resolved, but the
    // <style> blocks the user pasted are still used verbatim.
    const blocks: string[] = [];
    doc.querySelectorAll('style').forEach((styleEl) => {
      if (styleEl.textContent?.trim()) blocks.push(styleEl.textContent);
    });
    importedCss = withGaiaPanelBaseCss(doc, blocks.join('\n\n'));
    const linkCount = doc.querySelectorAll('link[rel="stylesheet"]').length;
    if (linkCount) {
      onProgress?.(
        `${linkCount} linked stylesheet(s) cannot be resolved without the profile URL`
      );
    }
  }

  const backgroundBase =
    base || (typeof window !== 'undefined' ? window.location.href : 'https://www.gaiaonline.com/');
  let background = detectProfileBackground(doc, importedCss, backgroundBase);
  onProgress?.(
    background.detected ? `Background found (${background.source})` : 'No CSS background found.'
  );

  onProgress?.('Verifying rendered background…');
  const probed = await probeRenderedBackground(serializeDoc(doc, importedCss), {
    timeoutMs: 9000,
  });
  background = mergeProbedBackground(background, probed);
  if (probed?.paints) {
    onProgress?.(`Background verified from rendered page (${probed.origin})`);
  }

  const rawCss = augmentCssWithBackground(importedCss, background);

  onProgress?.('Scraping Gaia V2 components…');
  const components = scrapeGaiaComponents(doc);

  onProgress?.('Reconstructing elements…');
  const { elements, settings } = reconstructElements(doc, rawCss);

  const warnings: string[] = [...cssChainWarnings];
  if (!base) {
    warnings.push(
      'No source URL supplied and the markup has no <link rel="canonical"> — linked stylesheets and @imports cannot be resolved. Load the saved page from the URL it was saved from (or fill in the profile URL) so the CSS chain is fetched 1:1.'
    );
  } else {
    const failed = stylesheets.filter((s) => !s.ok);
    if (failed.length) {
      warnings.push(
        `${failed.length} stylesheet(s) blocked by CORS — the browser will still request the original <link> at render time: ${failed
          .map((s) => `${s.url}${s.label ? ` [${s.label}]` : ''}`)
          .join(', ')}`
      );
    }
  }
  if (!background.detected) {
    warnings.push('No background style detected in the pasted markup.');
  } else if (!background.verified) {
    warnings.push(
      'The rendered-background check could not run in this browser — the background falls back to the parsed CSS values.'
    );
  }

  return {
    elements,
    settings: { ...settings, ...backgroundToSettings(background) },
    rawHtml: serializeDoc(doc, rawCss),
    rawCss,
    scriptsRemoved,
    sourceUrl: base || '(pasted HTML)',
    diagnostics: {
      stylesheetsFound: stylesheets.length,
      stylesheetsFetched: stylesheets.filter((s) => s.ok).length,
      stylesheetUrls: stylesheets,
      cssBytesInlined: rawCss.length,
      backgroundVerified: !!background.verified,
      background,
      components,
      warnings,
    },
  };
}

/** Stylesheet record type re-exported for consumers of the import feature. */
export type { StylesheetRecord } from '../../../utils/cssFidelity';
