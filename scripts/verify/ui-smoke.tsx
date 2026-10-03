/**
 * jsdom UI smoke harness (no real browser required) — run with `npm run verify:ui`.
 *
 * Covers the startup / tools / import regressions:
 *   • empty boot → welcome screen, no auto-created profile
 *   • New Profile → blank canvas, dock collapsed, rail open/close, select-to-open
 *   • Profile Tools → content type → Add to builder (element lands in canvas,
 *     dock opens because the new element is selected)
 *   • Effect Library categories / morph+3D presets reachable
 *   • Import (HTML paste + source URL) → scrape report lists the CSS chain,
 *     imported <html>/<body> live in the shadow canvas, imported CSS is verbatim
 *     except a compound-initial `:root` → `html`, multi-layer backgrounds are
 *     preserved, and `url()`s are absolutized
 *   • closing every tab returns to the welcome screen
 */
import { JSDOM } from 'jsdom';

/* ------------------------------- DOM shims -------------------------------- */
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const { window } = dom;
const g = globalThis as unknown as Record<string, unknown>;
g.window = window;
g.document = window.document;
// Node 22 exposes a getter-only `navigator`; define over it instead of assigning.
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
g.HTMLElement = window.HTMLElement;
g.HTMLIFrameElement = window.HTMLIFrameElement;
g.HTMLStyleElement = window.HTMLStyleElement;
g.HTMLLinkElement = window.HTMLLinkElement;
g.Node = window.Node;
g.Event = window.Event;
g.MouseEvent = window.MouseEvent;
g.PointerEvent = window.MouseEvent;
g.KeyboardEvent = window.KeyboardEvent;
g.DOMParser = window.DOMParser;
g.XMLSerializer = window.XMLSerializer;
g.NodeFilter = window.NodeFilter;
g.localStorage = window.localStorage;
g.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
g.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0);
g.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
g.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
g.CSS = { escape: (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) };
g.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no 2D canvas: report "unsupported" so canvas-confetti (via
// src/utils/celebrate.ts) is skipped instead of throwing asynchronously.
const originalCreateElement = window.document.createElement.bind(window.document);
(window.document as unknown as { createElement: typeof window.document.createElement }).createElement = ((
  tag: string,
  options?: ElementCreationOptions
) => {
  const el = originalCreateElement(tag, options);
  if (tag.toLowerCase() === 'canvas') {
    (el as HTMLCanvasElement).getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
  }
  return el;
}) as typeof window.document.createElement;

// jsdom's getComputedStyle returns '' for shorthands — the canvas code reads a
// few of them, so fill in neutral defaults instead of undefined.
const realGetComputedStyle = window.getComputedStyle.bind(window);
g.getComputedStyle = (el: Element, pseudo?: string | null) =>
  new Proxy(realGetComputedStyle(el, pseudo as string | undefined) as unknown as object, {
    get(target, prop: string) {
      const value = (target as Record<string, unknown>)[prop];
      if (typeof value === 'string' && value === '') {
        if (/^(position|display|float|clear|overflow|transform|clipPath|maskImage)$/.test(prop)) {
          return prop === 'position' ? 'static' : prop === 'display' ? 'block' : 'none';
        }
        return 'auto';
      }
      if (typeof value === 'function') return (value as () => unknown).bind(target);
      return value;
    },
  });

/* --------------------------- fixture + fetch stub -------------------------- */
const PROFILE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Smoke Fixture</title>
<link rel="canonical" href="https://example.invalid/profile.html">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4/animate.css">
<link rel="stylesheet" href="/css/theme.css">
<style>
@import url("https://example.invalid/css/profile.css");
:root { --smoke: 1; }
html { background: #0b1026 url('/img/bg.png') repeat fixed center; }
body { background-image: linear-gradient(180deg, rgba(3,3,3,0.2), rgba(3,3,3,0.8)); }
</style>
</head>
<body id="viewer">
<div id="columns">
  <div id="column_1" class="column"><div class="panel" id="id_details"><h2>Details</h2><div class="postcontent">fixture</div><div class="clear"></div></div></div>
  <div id="column_2" class="column"><div class="panel" id="id_comments"><h2>Comments</h2><div class="postcontent">fixture</div><div class="clear"></div></div></div>
  <div id="column_3" class="column"><div class="panel" id="id_friends"><h2>Friends</h2><div class="postcontent">fixture</div><div class="clear"></div></div></div>
</div>
</body>
</html>`;

const CSS_BY_URL: Record<string, string> = {
  'https://cdn.jsdelivr.net/npm/animate.css@4/animate.css':
    '@keyframes fadeInUp { from { opacity: 0 } to { opacity: 1 } }\n.fadeInUp { animation-name: fadeInUp; }\n',
  'https://example.invalid/css/profile.css':
    '.imported-marker { color: #14e07f; }\n#id_details .postcontent { letter-spacing: 0.02em; }\n',
  'https://example.invalid/css/theme.css':
    '#columns { width: 1000px; }\n.panel h2 { background-color: #16204a; }\n',
};

g.fetch = (async (input: RequestInfo | URL) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : String((input as Request).url);
  const body = CSS_BY_URL[url];
  if (body) {
    return new Response(body, { status: 200, headers: { 'content-type': 'text/css' } });
  }
  if (url.includes('profile.html') || url.endsWith('/smoke')) {
    return new Response(PROFILE_HTML, { status: 200, headers: { 'content-type': 'text/html' } });
  }
  return new Response('not found', { status: 404 });
}) as typeof fetch;

/* ------------------------------ react helpers ----------------------------- */
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: App } = await import('@/App');

const errors: string[] = [];
window.addEventListener('error', (event: Event) => {
  errors.push(String((event as ErrorEvent).message || event));
});

const container = window.document.getElementById('root') as HTMLElement;
const root = createRoot(container);

type Results = { name: string; pass: boolean; detail?: string };
const results: Results[] = [];
function check(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const settle = async (ms = 30) => {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, ms));
  });
};

const text = () => (window.document.body.textContent || '').replace(/\s+/g, ' ');

function buttonByText(label: string | RegExp, exact = false): HTMLButtonElement | null {
  const matcher =
    typeof label === 'string'
      ? (value: string) => (exact ? value.trim() === label : value.includes(label))
      : (value: string) => label.test(value);
  return (
    (Array.from(window.document.querySelectorAll('button')) as HTMLButtonElement[]).find((b) =>
      matcher(b.textContent || '')
    ) || null
  );
}

async function click(el: Element | null, label: string) {
  if (!el) {
    check(`click ${label}`, false, 'element not found');
    return false;
  }
  await act(async () => {
    (el as HTMLElement).click();
  });
  await settle(60);
  return true;
}

async function type(
  input: HTMLInputElement | HTMLTextAreaElement | null,
  value: string,
  label: string
) {
  if (!input) {
    check(`type ${label}`, false, 'input not found');
    return false;
  }
  await act(async () => {
    const proto =
      input instanceof window.HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  await settle(40);
  return true;
}

/* ---------------------- file / canonical-url helpers ---------------------- */
const { readTextFile, extractCanonicalUrl, formatBytes } = await import('@/utils/importFile');
{
  const file = new window.File([PROFILE_HTML], 'lonely83.html', { type: 'text/html' });
  const text = await readTextFile(file);
  check('saved page file can be read back', text === PROFILE_HTML, `${formatBytes(text.length)}`);
  check(
    'canonical URL is detected in saved markup',
    extractCanonicalUrl(text) === 'https://example.invalid/profile.html',
    extractCanonicalUrl(text) || 'null'
  );
  const noCanonical = extractCanonicalUrl('<html><body>nothing here</body></html>');
  check('markup without a canonical URL reports none', noCanonical === null);
  check(
    'og:url is accepted as a fallback',
    extractCanonicalUrl('<meta property="og:url" content="https://www.gaiaonline.com/profiles/lonely83/1215288/">') ===
      'https://www.gaiaonline.com/profiles/lonely83/1215288/'
  );
}

/* ---------------------------------- run ----------------------------------- */
await act(async () => {
  root.render(<App />);
});
await settle(120);

const isDockOpen = () => !!window.document.querySelector('[title="Collapse Panel"]');
const railButton = () =>
  window.document.querySelector('[title="Expand Panel"]') as HTMLElement | null;
const canvasCount = () =>
  window.document.querySelectorAll('[id^="el_"], [id^="gaia_"]').length;

check('boots to the welcome screen', /Start a profile from scratch/.test(text()));
check('no profile is auto-created', !window.document.querySelector('[title="Close tab"]'));

await click(buttonByText(/New Profile/i), 'New Profile');
check('New Profile creates a tab', !!window.document.querySelector('[title="Close tab"]'));
check('New Profile opens a blank canvas (no elements yet)', canvasCount() === 0, `${canvasCount()} elements`);

check('dock is collapsed for a fresh profile with nothing selected', !isDockOpen());
check('collapsed dock is reachable from the rail', !!railButton());
if (railButton()) {
  await click(railButton(), 'Expand Panel');
  check('dock opens from the rail', isDockOpen());
  await click(window.document.querySelector('[title="Collapse Panel"]'), 'Collapse Panel');
  check('dock collapses again', !isDockOpen());
}

/* --------------------------------- tools ---------------------------------- */
await click(buttonByText(/^Tools$/, true), 'Tools section');
check('Profile Tools section renders', /Profile Tools|Make anything/i.test(text()));

const addToBuilder = buttonByText(/Add to builder/i);
check('tools expose Add to builder', !!addToBuilder);

await click(buttonByText(/Details|Comments|Friends/), 'content type chip');
const beforeTools = canvasCount();
await click(addToBuilder, 'Add to builder');
await settle(200);
const afterTools = canvasCount();
check('Add to builder creates elements in the canvas', afterTools > beforeTools, `${beforeTools} → ${afterTools}`);
check('dock is open for the selected tool element', isDockOpen());

// Collapse, then select an existing element by hand: selection must re-open it.
await click(window.document.querySelector('[title="Collapse Panel"]'), 'Collapse Panel');
check('dock collapsed before manual selection', !isDockOpen());
// Builder elements use `el_…` ids, Gaia-derived ones `gaia_…`.
const canvasElement = window.document.querySelector(
  '[id^="el_"], [id^="gaia_"]'
) as HTMLElement | null;
if (canvasElement) {
  await act(async () => {
    canvasElement.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
    canvasElement.click();
  });
  await settle(80);
}
check('selecting an element re-opens the dock', !!canvasElement && isDockOpen());

await click(buttonByText(/^Tools$/, true), 'Tools section (again)');
await click(buttonByText(/Effect Library/i), 'tools Effects tab');
const categoryChip = buttonByText(/^(Motion|Shape|Surface|Text|Layout|All)$/i, true);
check('effect categories are present', !!categoryChip, categoryChip ? (categoryChip.textContent || '').trim() : 'none');
if (categoryChip) await click(categoryChip, 'tools category');
const morphTab = buttonByText(/Morph|3D/i);
check('morph/3D presets are reachable', !!morphTab, morphTab ? (morphTab.textContent || '').trim() : 'none');
if (morphTab) await click(morphTab, 'morph/3D tab');

/* ------------------------------- import path ------------------------------ */
await click(buttonByText(/^Builder$/, true), 'back to Builder');
if (isDockOpen()) {
  await click(window.document.querySelector('[title="Collapse Panel"]'), 'collapse dock before import');
}
check('dock collapsed before importing', !isDockOpen());

await click(buttonByText(/Import Profile/i) || buttonByText(/^Import$/, true), 'Import');
await settle(60);
check('import modal opens', /Import from URL|Import with HTML/.test(text()));

// The file path: drop the saved page in and let the canonical URL provide the
// base — no typing, and it works for profiles behind a login.
await click(buttonByText(/Import with HTML/i), 'Import with HTML tab');
const fileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement | null;
check('import modal offers a saved-page file picker', !!fileInput, fileInput?.getAttribute('accept') || '');
const dropZone = window.document.querySelector('textarea')?.parentElement;
if (fileInput && dropZone) {
  await act(async () => {
    dropZone.dispatchEvent(
      new window.Event('dragover', { bubbles: true, cancelable: true })
    );
    const file = new window.File([PROFILE_HTML], 'lonely83-profile.html', { type: 'text/html' });
    const drop = new window.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
    dropZone.dispatchEvent(drop);
  });
  await settle(200);
}
const textarea = window.document.querySelector('textarea') as HTMLTextAreaElement | null;
check(
  'dropped file fills the markup box',
  /id="columns"/.test(textarea?.value || ''),
  `${(textarea?.value || '').length} chars`
);
const baseInput = window.document.querySelector('input[placeholder*="example.com"]') as HTMLInputElement | null;
check(
  'canonical URL is used as the base automatically',
  (baseInput?.value || '') === 'https://example.invalid/profile.html',
  baseInput?.value || '(empty)'
);
await click(buttonByText(/^Parse HTML$/i), 'submit import');
await settle(1500);

const reportText = text();
check('import reports the CSS chain', /CSS chain/i.test(reportText) || /profile\.css/.test(reportText));
check('linked third-party sheet is listed', /Animate\.css|animate\.css/i.test(reportText));

await click(buttonByText(/Open in New Tab/i), 'open imported profile');
await settle(300);

const host = Array.from(window.document.querySelectorAll('*')).find(
  (el) => (el as HTMLElement).shadowRoot?.querySelector('[data-bb-import-body]')
) as HTMLElement | undefined;
const shadow = host?.shadowRoot || null;
check('imported profile renders in the canvas', !!shadow);
const htmlShell = shadow?.querySelector('html[data-bb-import-html]') as HTMLElement | null;
const bodyShell = shadow?.querySelector('[data-bb-import-body]') as HTMLElement | null;
check('shadow canvas keeps a real <html> root', !!htmlShell);
check('shadow canvas keeps the imported <body>', !!bodyShell);
check('imported head is preserved in order', !!shadow?.querySelector('[data-bb-import-head]'));

const styleText = Array.from(shadow?.querySelectorAll('style') || [])
  .map((s) => s.textContent || '')
  .join('\n');
check('custom property scope rewritten (:root → html)', /html \{\s*--smoke: 1;\s*\}/.test(styleText));
const rootHits = styleText.match(/.{0,60}:root.{0,60}/g) || [];
check('no :root survives in the canvas CSS', rootHits.length === 0, rootHits.slice(0, 2).join(' || '));
check(
  'multi-layer background value is preserved verbatim',
  /linear-gradient\(180deg,\s*rgba\(3,\s*3,\s*3,\s*0\.2\),\s*rgba\(3,\s*3,\s*3,\s*0\.8\)\)/.test(styleText)
);
check(
  'absolutized background image url is in the canvas CSS',
  /https:\/\/example\.invalid\/img\/bg\.png/.test(styleText)
);

const selectedAfterImport = !!window.document.querySelector('[data-bb-selected]');
const dockOpenAfterImport = isDockOpen();
check(
  'properties dock follows the imported selection state',
  selectedAfterImport ? dockOpenAfterImport : !dockOpenAfterImport,
  `selected=${selectedAfterImport} dockOpen=${dockOpenAfterImport}`
);

for (let i = 0; i < 5; i += 1) {
  const closeBtn = window.document.querySelector('[title="Close tab"]');
  if (!closeBtn) break;
  await click(closeBtn, 'close tab');
}
check('closing every tab returns to the welcome screen', /Start a profile from scratch/.test(text()));

check('no React/JS errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('Failed:');
  failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`));
  process.exitCode = 1;
}
setTimeout(() => process.exit(process.exitCode || 0), 50).unref?.();
