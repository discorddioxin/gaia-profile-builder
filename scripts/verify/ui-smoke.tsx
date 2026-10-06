/**
 * jsdom UI smoke harness (no real browser required) — run with `npm run verify:ui`.
 *
 * Covers the startup / tools / import regressions:
 *   • empty boot → welcome screen, no auto-created profile
 *   • New Profile → blank canvas, dock collapsed, rail open/close, select-to-open
 *   • Profile Tools → content type → Add to builder (element lands in canvas,
 *     dock opens because the new element is selected)
 *   • Tools = left 30% options + right 70% preview/CSS; tabs only reveal the
 *     left pane (the other lab stays mounted), Component Lab options are
 *     checkbox dropdowns, and Motion tooling gets one editable row per layer
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
const { readTextFile, extractCanonicalUrl, formatBytes } = await import('@/features/shared/import/importFile');
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

/* --------------------------- column geometry ------------------------------ */
{
  const { measureColumnShell, GAIA_SHELL_WIDTH, GAIA_V2_DEFAULT_CSS } = await import('@/utils/gaiaSpec');
  const { GAIA_V2_DEFAULT_CSS: defaults } = await import('@/utils/gaiaDefaults');
  void GAIA_V2_DEFAULT_CSS;
  const stock = measureColumnShell(defaults);
  check(
    'the stock V2 stylesheet measures as Gaia\'s 230/500/230 shell',
    stock.stock && stock.total === GAIA_SHELL_WIDTH && stock.widths[2] === 500 && stock.widths[1] === 230,
    `${stock.widths[1]}/${stock.widths[2]}/${stock.widths[3]} · ${stock.total}px`
  );
  const custom = measureColumnShell(
    '#column_1 { width: 260px; margin-left: 40px; } #column_2 { width: 640px; margin: 0 20px; } #column_3 { width: 260px; }'
  );
  check(
    'an imported profile\'s own column widths and margins are measured',
    !custom.stock && custom.widths[2] === 640 && custom.total === 40 + 260 + 20 + 640 + 20 + 260,
    `${custom.widths[1]}/${custom.widths[2]}/${custom.widths[3]} · ${custom.total}px`
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

check('Profile Tools is selected on startup', /Profile Tools|Make anything/i.test(text()));
check('no profile is auto-created', !window.document.querySelector('[title="Close tab"]'));
await click(buttonByText(/^Builder$/, true), 'Profile Builder section');
check('Builder opens to the welcome screen', /Start a profile from scratch/.test(text()));

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

/* The tool chooser is a flat tab bar under the top bar, not a boxed sidebar. */
const toolTabs = () =>
  Array.from(window.document.querySelectorAll('[role="tab"][aria-selected]')) as HTMLElement[];
const tabs = toolTabs();
check('Profile Tools chooser is a horizontal tab bar', tabs.length === 2, `${tabs.length} tabs`);
check(
  'tool tabs are flat (no button box, border radius or padding)',
  tabs.length === 2 &&
    tabs.every((tab) => !/rounded/.test(tab.className) && !/\bpx-/.test(tab.className) && !/\bbg-/.test(tab.className)),
  tabs.map((tab) => tab.className).join(' | ')
);
check('no Back to Profile Builder button remains', !/back to profile builder/i.test(text()));
check('the active tool tab is marked selected', tabs.filter((tab) => tab.getAttribute('aria-selected') === 'true').length === 1, tabs.map((tab) => `${tab.textContent?.trim()}:${tab.getAttribute('aria-selected')}`).join(' '));

const addToBuilder = buttonByText(/Add to builder/i);
check('tools expose Add to builder', !!addToBuilder);
const toolsPreviewDoc = () =>
  (window.document.querySelector('iframe[title="Profile tools preview"]') as HTMLIFrameElement | null)
    ?.srcdoc || '';

await click(buttonByText(/^Comments$/, true), 'content type chip');
check('tools expose Gaia spec IDs', /#id_(details|comments|friends).*#(details|comments|friends)_title/.test(text()));
const columnStrip = window.document.querySelector('[data-column-chooser]') as HTMLElement | null;
check('the preview keeps a column chooser', !!columnStrip);
const columnButtons = Array.from(
  columnStrip?.querySelectorAll('button[aria-pressed]') || []
) as HTMLElement[];
check(
  'the column chooser offers left / middle / right',
  columnButtons.length === 3 &&
    columnButtons.map((button) => (button.textContent || '').trim()).join(',') === 'Left,Middle,Right',
  columnButtons.map((button) => (button.textContent || '').trim()).join(',')
);
check(
  'column buttons carry Gaia\'s real column widths in their titles',
  columnButtons.map((button) => button.getAttribute('title') || '').join(' | ') ===
    'Left column · column width 230px | Middle column · column width 500px | Right column · column width 230px',
  columnButtons.map((button) => button.getAttribute('title') || '').join(' | ')
);
// Motion presets live in a checkbox dropdown now; picking two of them must
// produce two independent, individually editable tooling rows (checked below,
// once the Tools workbench is back on screen).

/* ------------------------- tools shell: css + zoom ------------------------ */
check('no Copy HTML button in the tools', !/Copy HTML/i.test(text()));
const cssPane = window.document.querySelector('section[aria-label="Generated CSS"]') as HTMLElement | null;
check('the CSS read-out is its own pane', !!cssPane);
check(
  'the CSS pane offers a CSS/Tree toggle and a Copy CSS action',
  !!cssPane &&
    !!Array.from(cssPane.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'Tree') &&
    !!Array.from(cssPane.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === 'CSS') &&
    !!Array.from(cssPane.querySelectorAll('button')).find((b) => /Copy CSS/i.test(b.textContent || ''))
);
check(
  'the CSS pane is given 30% of the column height',
  !!cssPane && /basis-\[30%\]/.test(cssPane.className),
  cssPane?.className || 'missing'
);

const cssPaneButton = (label: string, pane: HTMLElement | null) =>
  pane
    ? (Array.from(pane.querySelectorAll('button')).find(
        (b) => (b.textContent || '').trim() === label
      ) as HTMLButtonElement | undefined)
    : undefined;
check('the CSS pane exposes a Tree view toggle', !!cssPaneButton('Tree', cssPane));

const previewSurface = window.document.querySelector('[data-profile-preview]') as HTMLElement | null;
const inPreview = (selector: string) =>
  (previewSurface?.querySelector(selector) as HTMLElement | null) || null;
check('the live preview is a full-profile surface', !!previewSurface);
const zoomOut = inPreview('button[title="Zoom out"]') as HTMLButtonElement | null;
const zoomIn = inPreview('button[title="Zoom in"]') as HTMLButtonElement | null;
const zoomFit = inPreview('button[title="Fit the profile width to this pane"]') as HTMLButtonElement | null;
check('the live preview exposes zoom in / out / fit controls', !!zoomOut && !!zoomIn && !!zoomFit);
const zoomReadout = () => {
  const button = Array.from(previewSurface?.querySelectorAll('button') || []).find((candidate) =>
    /^\d+%$/.test((candidate.textContent || '').trim())
  );
  return (button?.textContent || '').trim();
};
const previewIframe = window.document.querySelector('iframe[title="Profile tools preview"]') as HTMLIFrameElement | null;
const beforeZoom = zoomReadout();
const beforeScale = previewIframe?.style.transform || '';
if (zoomIn) await click(zoomIn, 'zoom in');
await settle(60);
const afterZoom = zoomReadout();
const afterScale = previewIframe?.style.transform || '';
check(
  'zoom controls change the preview scale',
  !!beforeZoom && !!afterZoom && beforeZoom !== afterZoom && beforeScale !== afterScale,
  `${beforeZoom} -> ${afterZoom} · ${beforeScale} -> ${afterScale}`
);

check(
  'the Component Lab exposes motion tooling as a dropdown',
  !!window.document.querySelector('[data-dropdown="motion"]')
);
check(
  'the tools preview renders Gaia default V2 styling',
  /v2\/common\.css/.test(toolsPreviewDoc()) && /#3D8AD0/.test(toolsPreviewDoc())
);
check(
  'the tools preview lays the profile out with Gaia\'s own column geometry',
  /#column_1 \{[^}]*width: 230px[^}]*margin-left: 25px/.test(toolsPreviewDoc()) &&
    /#column_2 \{[^}]*width: 500px[^}]*margin: 0 10px/.test(toolsPreviewDoc()) &&
    /#column_3 \{[^}]*width: 230px/.test(toolsPreviewDoc()) &&
    /\.panel \{[^}]*padding: 15px/.test(toolsPreviewDoc()),
  `${toolsPreviewDoc().length} chars`
);
const beforeTools = canvasCount();
await click(addToBuilder, 'Add to builder');
await settle(200);
const afterTools = canvasCount();
check('Add to builder creates elements in the canvas', afterTools > beforeTools, `${beforeTools} → ${afterTools}`);
const realGaiaPanelPreview = window.document.querySelector('iframe[title="Comments Gaia panel preview"]') as HTMLIFrameElement | null;
check('Builder renders the real Gaia panel markup and IDs', !!realGaiaPanelPreview && /class="panel comments_panel" id="id_comments"/.test(realGaiaPanelPreview.srcdoc) && /id="comments_title"/.test(realGaiaPanelPreview.srcdoc));
check(
  'Builder canvas preview uses Gaia defaults without the builder theme',
  !!realGaiaPanelPreview &&
    /v2\/panels\.css/.test(realGaiaPanelPreview.srcdoc) &&
    /#3D8AD0/.test(realGaiaPanelPreview.srcdoc) &&
    !/rgba\(15, 23, 42/.test(realGaiaPanelPreview.srcdoc)
);
check('dock is open for the selected tool element', isDockOpen());

// Same column again: the component must take the next space at the bottom of
// the column instead of landing on top of the first one.
const gaiaPanels = () =>
  Array.from(window.document.querySelectorAll('[id^="gaia_"]')) as HTMLElement[];
const firstPanel = gaiaPanels()[0];
await click(buttonByText(/^Tools$/, true), 'Tools section (stacked add)');
await click(buttonByText(/Add to builder/i), 'Add to builder (stacked)');
await settle(250);
const panels = gaiaPanels();
check(
  'a second component stacks below the first in the toggled column',
  panels.length === 2 &&
    !!firstPanel &&
    panels[1].style.left === firstPanel.style.left &&
    parseFloat(panels[1].style.top) > parseFloat(firstPanel.style.top),
  `${panels.length} panels · ${panels.map((p) => `${p.style.left}/${p.style.top}`).join(' → ')}`
);
check(
  'the stacked panel exports into the same V2 column',
  panels.length === 2 && !!panels[1].style.left && panels[1].style.left === firstPanel?.style.left
);

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
await settle(120);

/* --------------------------- tools: workbench ----------------------------- */
check('the Effect Library tab and system are gone', !buttonByText(/Effect Library/i));

const optionsRegion = window.document.querySelector('[data-tools-options-region]') as HTMLElement | null;
const previewRegion = window.document.querySelector('[data-tools-preview-region]') as HTMLElement | null;
check(
  'the options pane is 30% of the width and the preview 70%',
  !!optionsRegion &&
    !!previewRegion &&
    /lg:w-\[30%\]/.test(optionsRegion.className) &&
    /lg:w-\[70%\]/.test(previewRegion.className),
  `${optionsRegion?.className.match(/lg:w-\[[^\]]+\]/)?.[0]} / ${previewRegion?.className.match(/lg:w-\[[^\]]+\]/)?.[0]}`
);
check(
  'the preview pane keeps the CSS pane at 30% of its height',
  !!previewRegion?.querySelector('.basis-\\[30\\%\\]')
);

// Tabs live in the left pane only: both labs stay mounted and the preview
// iframe is the same DOM node before and after a switch.
const previewIframeBefore = window.document.querySelector('iframe[title="Profile tools preview"]');
check('Component Lab has checkbox dropdowns', !!window.document.querySelector('[data-dropdown="motion"]'));
const motionTrigger = window.document.querySelector(
  '[data-dropdown="motion"] > button'
) as HTMLElement | null;
if (motionTrigger) await click(motionTrigger, 'open the motion dropdown');
const motionCheckboxes = window.document.querySelectorAll(
  '[data-dropdown="motion"] input[type="checkbox"]'
);
check(
  'motion presets are offered as checkboxes',
  motionCheckboxes.length > 0,
  `${motionCheckboxes.length} checkboxes`
);
check(
  'the motion dropdown carries animations, morphs and 3D presets',
  /Animations/.test(text()) && /Morphs/.test(text()) && /3D/.test(text())
);
const firstMotionCheckbox = motionCheckboxes[0] as HTMLInputElement | undefined;
if (firstMotionCheckbox) {
  await act(async () => {
    firstMotionCheckbox.click();
  });
  await settle(80);
}
const secondMotionCheckbox = window.document.querySelectorAll(
  '[data-dropdown="motion"] input[type="checkbox"]'
)[1] as HTMLInputElement | undefined;
if (secondMotionCheckbox) {
  await act(async () => {
    secondMotionCheckbox.click();
  });
  await settle(80);
}
check(
  'each selected motion tooling gets its own editable row',
  window.document.querySelectorAll('[data-motion-layer]').length === 2,
  `${window.document.querySelectorAll('[data-motion-layer]').length} rows`
);

// Column chooser uses Gaia's own column widths (230 / 500 / 230).
const leftColumnButton = buttonByText(/^Left$/, true);
const middleColumnButton = buttonByText(/^Middle$/, true);
if (leftColumnButton) await click(leftColumnButton, 'Left column');
await settle(60);
const columnStripText = () => previewRegion?.querySelector('[data-column-chooser]')?.textContent || '';
check(
  'the column chooser reports Gaia\'s real column width',
  /column 230px · shell 1005px · Gaia defaults/.test(columnStripText()),
  columnStripText().trim().replace(/\s+/g, ' ').slice(0, 80) || 'none'
);
if (middleColumnButton) await click(middleColumnButton, 'Middle column');
await settle(60);
check(
  'the middle column uses Gaia\'s 500px content width',
  /column 500px/.test(columnStripText())
);
const generatedCss = window.document.querySelector('[data-css-pane] pre')?.textContent || '';
check(
  'generated CSS carries no comments',
  !!generatedCss && !/\/\*/.test(generatedCss),
  generatedCss.slice(0, 60)
);
check(
  'the per-tool rows drive the generated override CSS',
  /animation:/.test(generatedCss) && /--tool-perspective/.test(generatedCss)
);
const cssPaneNow = window.document.querySelector('[data-css-pane]') as HTMLElement | null;
const treeToggleNow = cssPaneButton('Tree', cssPaneNow);
if (treeToggleNow) await click(treeToggleNow, 'Tree view');
const treeNode = window.document.querySelector(
  '[data-css-pane] button[aria-label="Collapse"], [data-css-pane] button[aria-label="Expand"]'
);
check('switching to Tree view renders navigable CSS nodes', !!treeNode);
const backToCss = cssPaneButton('CSS', window.document.querySelector('[data-css-pane]') as HTMLElement | null);
if (backToCss) await click(backToCss, 'CSS view');

const backgroundTab = buttonByText(/Background Studio/i);
if (backgroundTab) await click(backgroundTab, 'Background Studio tab');
await settle(120);
const componentPane = window.document.querySelector('[data-tools-pane="component"]') as HTMLElement | null;
const backgroundPane = window.document.querySelector('[data-tools-pane="background"]') as HTMLElement | null;
check(
  'switching tools tabs only swaps the left pane body',
  !!componentPane &&
    !!backgroundPane &&
    componentPane.className.includes('hidden') &&
    !backgroundPane.className.includes('hidden') &&
    !!optionsRegion?.contains(backgroundPane)
);
check(
  'the live preview pane is not rebuilt by a tab switch',
  !!previewIframeBefore &&
    window.document.querySelector('iframe[title="Profile tools preview"]') === previewIframeBefore &&
    !!window.document.querySelector('[data-tools-preview-region] .basis-\\[30\\%\\]'),
  window.document.querySelector('[data-tools-preview-region]')?.className || 'missing'
);
const componentTab = buttonByText(/Component Lab/i);
if (componentTab) await click(componentTab, 'Component Lab tab');
await settle(120);
check(
  'returning to Component Lab keeps the left-pane work',
  window.document.querySelectorAll('[data-motion-layer]').length === 2 &&
    !(window.document.querySelector('[data-tools-pane="component"]') as HTMLElement | null)?.className.includes('hidden')
);

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

/* ------------------------- tools: shared import --------------------------- */
await click(buttonByText(/^Tools$/, true), 'Tools section (import check)');
await settle(150);
const importButton = buttonByText(/Import profile/i);
check('tools can import a profile', !!importButton);
if (importButton) await click(importButton, 'tools import');
await settle(60);
check('the tools import dialog opens', /Import from URL|Import with HTML/.test(text()));
await click(buttonByText(/Import with HTML/i), 'tools import with HTML');

const toolsFileInput = window.document.querySelector('input[type="file"]') as HTMLInputElement | null;
const toolsDropZone = window.document.querySelector('textarea')?.parentElement;
if (toolsFileInput && toolsDropZone) {
  await act(async () => {
    const file = new window.File([PROFILE_HTML], 'lonely83-profile.html', { type: 'text/html' });
    const drop = new window.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
    toolsDropZone.dispatchEvent(drop);
  });
  await settle(200);
}
await click(buttonByText(/^Parse HTML$/i), 'parse tools import');
await settle(1500);
await click(buttonByText(/Load into Preview/i), 'load into tools preview');
await settle(400);
const importedPreview = window.document.querySelector('iframe[title="Profile tools preview"]') as HTMLIFrameElement | null;
check(
  'the tools preview renders the imported profile and its CSS chain',
  !!importedPreview &&
    /id="columns"/.test(importedPreview.srcdoc) &&
    /example\.invalid/.test(importedPreview.srcdoc),
  `${(importedPreview?.srcdoc || '').length} chars`
);
check('the imported profile can be cleared from the tools', !!buttonByText(/^Clear$/, true));
const clearImport = buttonByText(/^Clear$/, true);
if (clearImport) await click(clearImport, 'clear imported profile');
await settle(120);
check('clearing returns the preview to the sample profile', !/example\.invalid/.test(toolsPreviewDoc()));

const reopenImport = buttonByText(/Import profile/i);
if (reopenImport) await click(reopenImport, 'reopen tools import');
await settle(60);

// The URL tab must offer a way out of a hanging fetch: stub fetch with a
// promise that never settles, start a fetch, then cancel it.
const realFetch = globalThis.fetch;
let fetchCalls = 0;
let fetchAborts = 0;
// The app modules resolve `fetch` from the Node realm, so stub the global.
// The stub honours abort the way a real transport does.
(globalThis as unknown as { fetch: unknown }).fetch = (
  _url: string,
  init?: { signal?: AbortSignal }
) => {
  fetchCalls += 1;
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      fetchAborts += 1;
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    });
  });
};
await click(buttonByText(/Import from URL/i), 'tools import from URL');
const urlField = window.document.querySelector('input[placeholder*="example.com"]') as HTMLInputElement | null;
if (urlField) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  await act(async () => {
    setter?.call(urlField, 'https://example.invalid/profile');
    urlField.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const urlForm = urlField?.closest('form');
await act(async () => {
  urlForm?.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
});
await settle(80);
const cancelFetch = buttonByText(/Cancel fetch/i);
check('a hanging fetch exposes a cancel control', fetchCalls > 0 && !!cancelFetch, `${fetchCalls} fetch calls`);
if (cancelFetch) await click(cancelFetch, 'cancel hanging fetch');
await settle(60);
check(
  'cancelling a fetch aborts the request and returns the dialog to idle',
  fetchAborts > 0 && !buttonByText(/Cancel fetch/i),
  `${fetchAborts} aborted of ${fetchCalls}`
);
(globalThis as unknown as { fetch: typeof fetch }).fetch = realFetch;
await click(buttonByText(/^Cancel$/, true), 'close import dialog');
await settle(60);
await click(buttonByText(/^Builder$/, true), 'back to Builder after tools import');
await settle(120);

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
