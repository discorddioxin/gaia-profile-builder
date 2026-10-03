/**
 * End-to-end background fidelity check (real Chromium).
 *
 * 1. Serves a Gaia-like fixture profile from a local HTTP server.
 * 2. Renders it in Chromium and records the *expected* surface (computed styles
 *    + a screenshot pixel of the CSS background image).
 * 3. Drives the built app (dist/ served by `vite preview`) through a real URL
 *    import, then reads the imported canvas' shadow DOM and the raw iframe.
 * 4. Compares the two and prints PASS/FAIL per check.
 *
 * Usage: node scripts/verify/background-fidelity.mjs [--app <url>] [--keep-open]
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { startFixtureServer, FIXTURE, STARFIELD_RGB } from './fixture-server.mjs';

const require = createRequire(import.meta.url);
let puppeteer;
try {
  puppeteer = require('puppeteer-core');
} catch {
  console.error(
    'Missing dev dependencies for the fidelity check.\n' +
      'Install them without touching package.json:\n' +
      '  npm i --no-save puppeteer-core @sparticuz/chromium\n' +
      'and inflate the bundled Chromium (bin/chromium.br → /tmp/chromium,\n' +
      'bin/al2023.tar.br + bin/fonts.tar.br → /tmp/gchromium).'
  );
  process.exit(2);
}
if (!fs.existsSync('/tmp/chromium')) {
  console.error('Chromium binary not found at /tmp/chromium (see scripts/verify/README notes).');
  process.exit(2);
}

const ROOT = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const appUrlArg = args.includes('--app') ? args[args.indexOf('--app') + 1] : null;
const FIXTURE_PORT = 4599;
const APP_PORT = 4178;

const CHROME_ENV = {
  ...process.env,
  LD_LIBRARY_PATH: '/tmp/gchromium/lib:/tmp/gchromium/fonts/lib',
  FONTCONFIG_PATH: '/tmp/gchromium/fonts',
  HOME: '/tmp',
};

/* ------------------------------- reporting ------------------------------- */
const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const BG_PROPS = ['backgroundColor', 'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'backgroundSize', 'backgroundAttachment'];
void BG_PROPS;

async function readSurface(frame, selector, props) {
  return frame.evaluate(
    (sel, propNames, rgb) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const out = {};
      propNames.forEach((p) => {
        out[p] = cs[p];
      });
      out.rect = {
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height),
      };
      void rgb;
      return out;
    },
    selector,
    props,
    STARFIELD_RGB
  );
}

/* --------------------------- app import driving --------------------------- */
async function driveImport(page, profileUrl) {
  // Welcome screen → Import Profile
  // Welcome screen ("Import Profile") or a header button when a tab is open.
  await page.evaluate(() => {
    const welcome = Array.from(document.querySelectorAll('button')).find((b) =>
      /import profile/i.test(b.textContent || '')
    );
    welcome?.click();
  });

  await page.waitForSelector('input[placeholder^="https://"][type="text"], input[placeholder*="example.com"]', {
    timeout: 15000,
  });

  const inputs = await page.$$('input[type="text"]');
  let urlInput = null;
  for (const input of inputs) {
    const ph = await input.evaluate((el) => el.getAttribute('placeholder') || '');
    if (/example\.com|bbs\./.test(ph)) {
      urlInput = input;
      break;
    }
  }
  if (!urlInput) throw new Error('URL input not found');

  await urlInput.click({ clickCount: 3 });
  await urlInput.type(profileUrl, { delay: 5 });

  const submitted = await page.evaluate(() => {
    const form = document.querySelector('form');
    const btn = form
      ? Array.from(form.querySelectorAll('button')).find((b) => /fetch|import/i.test(b.textContent || ''))
      : null;
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!submitted) throw new Error('Import submit button not found');

  // The import runs: fetch → CSS chain → browser probe → elements. Wait for the
  // result panel (Scrape Report) or for the modal to close.
  await page.waitForFunction(
    () => {
      const text = document.body.innerText || '';
      return /Scrape Report|CSS chain/.test(text);
    },
    { timeout: 90000 }
  );
}

/** Click "Add to builder"/"Open in builder"-style primary action. */
async function openInBuilder(page) {
  const labels = [/open in new tab/i, /open .*builder/i, /add to builder/i, /use this profile/i];
  for (const re of labels) {
    const done = await page.evaluate(
      (src) => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) => new RegExp(src, 'i').test(b.textContent || ''));
        if (!btn) return false;
        btn.click();
        return true;
      },
      re.source
    );
    if (done) return true;
  }
  return false;
}

async function readShadowSurface(page, propNames) {
  return page.evaluate((props) => {
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        const sr = el.shadowRoot;
        if (sr?.querySelector('[data-bb-import-body]')) return sr;
        const nested = sr ? walk(sr) : null;
        if (nested) return nested;
      }
      return null;
    };
    const shadow = walk(document);
    if (!shadow) return null;
    const read = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const out = {};
      props.forEach((p) => {
        out[p] = cs[p];
      });
      return out;
    };
    return {
      html: read(shadow.querySelector('html[data-bb-import-html]') || shadow.querySelector('html')),
      body: read(shadow.querySelector('[data-bb-import-body]')),
    };
  }, propNames);
}

async function waitForShadowCanvas(page, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ok = await page.evaluate(() => {
      const walk = (root) => {
        const all = root.querySelectorAll('*');
        for (const el of all) {
          const sr = el.shadowRoot;
          if (sr && sr.querySelector('[data-bb-import-body]')) return true;
          if (sr && walk(sr)) return true;
        }
        return false;
      };
      return walk(document);
    });
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/* ---------------------------------- main --------------------------------- */
async function main() {
  const server = await startFixtureServer(FIXTURE_PORT);
  const fixtureUrl = `http://127.0.0.1:${FIXTURE_PORT}/profile.html`;

  // Rough CSS text for the served third-party sheets (sanity only).
  void FIXTURE.THEME_CSS;

  // Serve the built app.
  let appUrl = appUrlArg;
  let preview = null;
  if (!appUrl) {
    if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) {
      throw new Error('dist/index.html missing — run `npm run build` first');
    }
    preview = spawn(
      path.join(ROOT, 'node_modules/.bin/vite'),
      ['preview', '--host', '0.0.0.0', '--port', String(APP_PORT), '--strictPort'],
      { cwd: ROOT, stdio: 'inherit' }
    );
    appUrl = `http://127.0.0.1:${APP_PORT}/`;
    await new Promise((r) => setTimeout(r, 2500));
  }

  const browser = await puppeteer.launch({
    executablePath: '/tmp/chromium',
    headless: true,
    env: CHROME_ENV,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--hide-scrollbars',
    ],
  });

  try {
    /* ------------------ 1. expected: the served fixture page ------------------ */
    const ref = await browser.newPage();
    await ref.setViewport({ width: 1100, height: 900 });
    await ref.goto(fixtureUrl, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));

    const props = ['backgroundColor', 'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'backgroundSize', 'backgroundAttachment', 'color', 'fontFamily'];
    const refHtml = await readSurface(ref.mainFrame(), 'html', props);
    const refBody = await readSurface(ref.mainFrame(), 'body', props);

    check(
      'fixture page paints a CSS background image on html',
      !!refHtml && refHtml.backgroundImage.includes('starfield.png'),
      refHtml?.backgroundImage
    );
    check(
      'fixture page background image is actually decoded (naturalWidth)',
      await ref.mainFrame().evaluate(async () => {
        const img = new Image();
        img.src = '/img/starfield.png';
        try {
          await img.decode();
        } catch {
          return false;
        }
        return img.naturalWidth > 0;
      })
    );

    void (await ref.screenshot({ encoding: 'base64' }));

    /* --------------------- 2. import the page in the app -------------------- */
    const page = await browser.newPage();
    await page.setViewport({ width: 1600, height: 1000 });
    const consoleErrors = [];
    page.on('pageerror', (err) => consoleErrors.push(String(err)));
    await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.innerText.trim().length > 20, { timeout: 30000 });

    // Capture the import result for assertions (the app exposes nothing, so we
    // intercept the diag text from the modal before it closes).
    await driveImport(page, fixtureUrl);

    // textContent (not innerText): the CSS-chain panel is a collapsed <details>,
    // whose contents are still what the user can expand and read.
    const reportText = await page.evaluate(() => document.body.textContent || '');
    for (const sheet of ['gaia_theme.css', 'thirdparty/animate.css', 'profile_import.css']) {
      check(
        `scrape report lists ${sheet}`,
        reportText.includes(sheet),
        reportText.includes(sheet) ? '' : 'sheet not mentioned in the CSS chain panel'
      );
    }
    check('scrape report marks the background as verified', /verified in rendered page/i.test(reportText));
    check(
      'scrape report names the third-party library',
      /Animate\.css|third-party/i.test(reportText) || /animate\.css/i.test(reportText)
    );

    const opened = await openInBuilder(page);
    check('import result can be opened in the builder', opened);
    const shadowReady = await waitForShadowCanvas(page);
    check('editable canvas renders an imported <html>/<body> in shadow DOM', shadowReady);

    // Wait for linked CSS/images inside the canvas to settle.
    await new Promise((r) => setTimeout(r, 2500));

    /* ------------------- 3. actual: the imported canvas --------------------- */
    const actual = await page.evaluate((propNames) => {
      const findShadow = () => {
        const walk = (root) => {
          for (const el of root.querySelectorAll('*')) {
            const sr = el.shadowRoot;
            if (sr?.querySelector('[data-bb-import-body]')) return sr;
            const nested = sr ? walk(sr) : null;
            if (nested) return nested;
          }
          return null;
        };
        return walk(document);
      };
      const shadow = findShadow();
      if (!shadow) return null;
      const read = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const out = {};
        propNames.forEach((p) => {
          out[p] = cs[p];
        });
        const r = el.getBoundingClientRect();
        out.rect = { width: Math.round(r.width), height: Math.round(r.height) };
        return out;
      };
      const htmlEl = shadow.querySelector('html[data-bb-import-html]') || shadow.querySelector('html');
      const bodyEl = shadow.querySelector('[data-bb-import-body]');
      const columns = shadow.querySelector('#columns');
      const col1 = shadow.querySelector('#column_1');
      const col2 = shadow.querySelector('#column_2');
      const col3 = shadow.querySelector('#column_3');
      const importedMarker = shadow.querySelector('.imported-marker');
      // Third-party sheet content + linked theme sheet content must be live.
      const title = shadow.querySelector('#details_title');
      const host = shadow.host;
      return {
        hasHtmlRoot: !!htmlEl,
        html: read(htmlEl),
        body: read(bodyEl),
        columnsWidth: columns ? Math.round(columns.getBoundingClientRect().width) : null,
        colWidths: [col1, col2, col3].map((c) => (c ? Math.round(c.getBoundingClientRect().width) : null)),
        importedMarkerColor: importedMarker ? getComputedStyle(importedMarker).color : null,
        titleAnimation: title ? getComputedStyle(title).animationName : null,
        titleAnimationDuration: title ? getComputedStyle(title).animationDuration : null,
        titleBackground: title ? getComputedStyle(title).backgroundColor : null,
        hostRect: host ? (() => { const r = host.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })() : null,
        hostTop: host ? host.getBoundingClientRect().top + window.scrollY : null,
      };
    }, props);

    check('shadow canvas exposes computed styles', !!actual?.html && !!actual?.body);
    if (actual?.html && refHtml) {
      const props = ['backgroundColor', 'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'backgroundSize', 'backgroundAttachment'];
      const diffs = props.filter((p) => actual.html[p] !== refHtml[p]);
      check(
        'html surface matches the served page 1:1',
        diffs.length === 0,
        diffs.length ? diffs.map((p) => `${p}: ${actual.html[p]} vs ${refHtml[p]}`).join(' | ') : actual.html.backgroundImage.slice(0, 90)
      );
      // Attachment is reported per the canvas scroll box; compare the rest.
      const fontDiffs = ['color', 'fontFamily'].filter((p) => actual.body[p] !== refBody[p]);
      check(
        'body typography/colour matches the served page',
        fontDiffs.length === 0,
        fontDiffs.length ? fontDiffs.map((p) => `${p}: ${actual.body[p]} vs ${refBody[p]}`).join(' | ') : actual.body.color
      );
    }

    check('#columns keeps the served layout width (1000px)', actual?.columnsWidth === 1000, `${actual?.columnsWidth}px`);
    check(
      'column widths match the sheet (#column_1 330px override)',
      JSON.stringify(actual?.colWidths) === JSON.stringify([330, 320, 320]),
      JSON.stringify(actual?.colWidths)
    );
    check(
      '@import-ed profile sheet applies',
      (actual?.importedMarkerColor || '').replace(/\s/g, '') === 'rgb(20,224,127)',
      actual?.importedMarkerColor || 'n/a'
    );
    check(
      'third-party library CSS is live (animate.css keyframes)',
      actual?.titleAnimation === 'fadeInUp',
      `animation-name: ${actual?.titleAnimation} / ${actual?.titleAnimationDuration}`
    );
    check(
      'linked theme stylesheet is live (.panel h2 background)',
      (actual?.titleBackground || '').replace(/\s/g, '') === 'rgb(22,32,74)',
      actual?.titleBackground || 'n/a'
    );

    /* ------------------ 4. pixels: the image actually painted ---------------- */
    // Sample the same *relative* points on both renders: the canvas is a
    // different size than the reference page, so relative corners are the only
    // honest comparison. The fixture's html layer is the CSS background image
    // while the body box only covers its own content height.
    const canvasPoints = await surfacePoints(page, actual?.hostRect);
    const refPoints = await surfacePoints(ref, { x: 0, y: 0, width: 1100, height: 900 });

    const bottomKey = 'bottomLeft';
    check(
      'reference page paints the CSS background image (teal corner)',
      isTeal(refPoints[bottomKey]),
      `${bottomKey} ${rgbText(refPoints[bottomKey])}`
    );
    check(
      'imported canvas paints the same CSS background image (teal corner)',
      isTeal(canvasPoints[bottomKey]),
      `${bottomKey} ${rgbText(canvasPoints[bottomKey])}`
    );
    for (const key of ['topLeft', 'bottomLeft']) {
      const a = canvasPoints[key];
      const b = refPoints[key];
      const match =
        a && b && Math.max(Math.abs(a.r - b.r), Math.abs(a.g - b.g), Math.abs(a.b - b.b)) <= 14;
      check(
        `pixel ${key} matches the served page`,
        !!match,
        `${rgbText(a)} vs ${rgbText(b)}`
      );
    }

    /* --------------- 5. pass 2: the sandboxed raw HTML preview -------------- */
    // The modal can open the same import in "Faithful HTML" (srcdoc iframe)
    // mode, which is the other surface that must show the real background.
    const reopened = await page.evaluate(() => {
      const btn =
        Array.from(document.querySelectorAll('button')).find((b) => /^\s*Import\s*$/.test(b.textContent || '')) ||
        Array.from(document.querySelectorAll('button')).find((b) => /import from url/i.test(b.getAttribute('title') || ''));
      if (!btn) return false;
      btn.click();
      return true;
    });
    check('header Import button re-opens the importer', reopened);
    if (reopened) {
      await page.waitForSelector('form', { timeout: 15000 });
      await driveImport(page, fixtureUrl);
      const rawModeSelected = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          /Faithful HTML/.test(b.textContent || '')
        );
        if (!btn) return false;
        btn.click();
        return true;
      });
      check('Faithful HTML mode can be selected', rawModeSelected);
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          /Open in New Tab/i.test(b.textContent || '')
        );
        btn?.click();
      });

      const iframeOk = await page
        .waitForFunction(
          () => {
            const frames = Array.from(document.querySelectorAll('iframe'));
            return frames.some((f) => {
              try {
                return !!f.contentDocument?.querySelector('#columns');
              } catch {
                return false;
              }
            });
          },
          { timeout: 30000 }
        )
        .then(() => true)
        .catch(() => false);
      check('raw preview iframe renders the profile document', iframeOk);

      if (iframeOk) {
        await new Promise((r) => setTimeout(r, 1500));
        const rawInfo = await page.evaluate(() => {
          const frame = Array.from(document.querySelectorAll('iframe')).find((f) => {
            try {
              return !!f.contentDocument?.querySelector('#columns');
            } catch {
              return false;
            }
          });
          const doc = frame.contentDocument;
          const cs = (el) => {
            if (!el) return null;
            const s = getComputedStyle(el);
            return {
              backgroundColor: s.backgroundColor,
              backgroundImage: s.backgroundImage,
              backgroundRepeat: s.backgroundRepeat,
              backgroundPosition: s.backgroundPosition,
              backgroundSize: s.backgroundSize,
              backgroundAttachment: s.backgroundAttachment,
              color: s.color,
              fontFamily: s.fontFamily,
            };
          };
          const r = frame.getBoundingClientRect();
          return {
            html: cs(doc.documentElement),
            body: cs(doc.body),
            columnsWidth: Math.round(doc.querySelector('#columns')?.getBoundingClientRect().width || 0),
            importedMarker: doc.querySelector('.imported-marker') ? getComputedStyle(doc.querySelector('.imported-marker')).color : null,
            rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          };
        });
        const props = ['backgroundColor', 'backgroundImage', 'backgroundRepeat', 'backgroundPosition', 'backgroundSize', 'backgroundAttachment'];
        const diffs = props.filter((p) => rawInfo.html[p] !== refHtml[p]);
        check(
          'raw preview html surface matches the served page 1:1',
          diffs.length === 0,
          diffs.length ? diffs.map((p) => `${p}: ${rawInfo.html[p]} vs ${refHtml[p]}`).join(' | ') : rawInfo.html.backgroundImage.slice(0, 80)
        );
        check('raw preview keeps #columns width 1000px', rawInfo.columnsWidth === 1000, `${rawInfo.columnsWidth}px`);
        check(
          'raw preview applies the @import-ed profile sheet',
          (rawInfo.importedMarker || '').replace(/\s/g, '') === 'rgb(20,224,127)',
          rawInfo.importedMarker || 'n/a'
        );
        const rawPoints = await surfacePoints(page, rawInfo.rect);
        check(
          'raw preview paints the CSS background image (teal corner)',
          isTeal(rawPoints.bottomLeft),
          `bottomLeft ${rgbText(rawPoints.bottomLeft)}`
        );
      }
    }

    /* ------- 6. pass 3: gradients and multi-layer background values ---------- */
    const gradientUrl = `http://127.0.0.1:${FIXTURE_PORT}/profile-gradient.html`;
    const gradientRef = await browser.newPage();
    await gradientRef.setViewport({ width: 1100, height: 900 });
    await gradientRef.goto(gradientUrl, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    const refGradient = {
      html: await readSurface(gradientRef.mainFrame(), 'html', props),
      body: await readSurface(gradientRef.mainFrame(), 'body', props),
    };

    const reopened3 = await page.evaluate(() => {
      const btn =
        Array.from(document.querySelectorAll('button')).find((b) => /^\s*Import\s*$/.test(b.textContent || '')) ||
        Array.from(document.querySelectorAll('button')).find((b) => /import from url/i.test(b.getAttribute('title') || ''));
      if (!btn) return false;
      btn.click();
      return true;
    });
    check('importer reopens for the gradient profile', reopened3);
    if (reopened3) {
      await page.waitForSelector('form', { timeout: 15000 });
      await driveImport(page, gradientUrl);
      const openedAgain = await openInBuilder(page);
      check('gradient import opens in the builder (editable canvas mode)', openedAgain);
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find((b) =>
          /Editable Canvas/.test(b.textContent || '')
        );
        btn?.click();
        const apply = Array.from(document.querySelectorAll('button')).find((b) =>
          /Open in New Tab/i.test(b.textContent || '')
        );
        apply?.click();
      });
      await new Promise((r) => setTimeout(r, 3000));
      const gradientActual = await readShadowSurface(page, props);
      check('gradient profile renders in the shadow canvas', !!gradientActual?.html && !!gradientActual?.body);
      if (gradientActual?.html && refGradient.html) {
        const surfaceProps = [
          'backgroundColor',
          'backgroundImage',
          'backgroundRepeat',
          'backgroundPosition',
          'backgroundSize',
          'backgroundAttachment',
        ];
        const diffs = surfaceProps.filter((p) => gradientActual.html[p] !== refGradient.html[p]);
        check(
          'gradient profile html surface matches 1:1',
          diffs.length === 0,
          diffs.length ? diffs.map((p) => `${p}: ${gradientActual.html[p]} vs ${refGradient.html[p]}`).join(' | ') : gradientActual.html.backgroundImage.slice(0, 60)
        );
        const bodyDiffs = surfaceProps.filter((p) => gradientActual.body[p] !== refGradient.body[p]);
        check(
          'multi-layer gradient body surface matches 1:1 (layers, sizes, positions)',
          bodyDiffs.length === 0,
          bodyDiffs.length
            ? bodyDiffs.map((p) => `${p}:
      canvas: ${gradientActual.body[p]}
      page:   ${refGradient.body[p]}`).join('\n')
            : `layers: ${gradientActual.body.backgroundImage.replace(/\s+/g, ' ').slice(0, 110)}`
        );
      }
    }

    check('no React/JS errors during import', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

    if (args.includes('--dump')) {
      console.log(JSON.stringify({ refHtml, refBody, actual }, null, 2));
    }
  } finally {
    await browser.close().catch(() => {});
    server.close();
    if (preview) preview.kill('SIGTERM');
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('Failed:');
    failed.forEach((f) => console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`));
  }
  process.exit(failed.length ? 1 : 0);
}

const rgbText = (px) => (px ? `rgb(${px.r},${px.g},${px.b})` : 'no pixel');

function isTeal(px) {
  return !!px && px.g > px.r + 20 && px.g > px.b + 5;
}

/**
 * Screenshot + decode a handful of points inside a rect, expressed relative to
 * that rect (inset so borders/panels cannot skew the sample).
 */
async function surfacePoints(page, rect) {
  if (!rect || rect.width < 40 || rect.height < 40) return {};
  const clip = await page.evaluate((r) => {
    const left = Math.max(0, r.x);
    const top = Math.max(0, r.y);
    const right = Math.min(window.innerWidth, r.x + r.width);
    const bottom = Math.min(window.innerHeight, r.y + r.height);
    return {
      left: Math.round(left),
      top: Math.round(top),
      right: Math.round(right),
      bottom: Math.round(bottom),
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  }, rect);
  if (clip.right - clip.left < 40 || clip.bottom - clip.top < 40) return {};
  const inset = 6;
  const points = {
    topLeft: { x: clip.left + inset, y: clip.top + inset },
    bottomLeft: { x: clip.left + inset, y: clip.bottom - inset - 2 },
    bottomRight: { x: clip.right - inset - 2, y: clip.bottom - inset - 2 },
  };
  const out = {};
  for (const [key, pt] of Object.entries(points)) {
    const shot = await page.screenshot({
      clip: { x: Math.max(0, pt.x), y: Math.max(0, pt.y), width: 2, height: 2 },
      encoding: 'base64',
    });
    out[key] = decodePixel(shot, 0, 0);
  }
  return out;
}

/* Minimal PNG decoder (RGBA/8-bit, non-interlaced) — enough for screenshots. */
function decodePixel(base64, px, py) {
  const buf = Buffer.from(base64, 'base64');
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const zlib = require('node:zlib');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const lines = [];
  let prev = Buffer.alloc(stride);
  let off = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[off];
    off += 1;
    const line = Buffer.from(raw.subarray(off, off + stride));
    off += stride;
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? line[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      if (filter === 1) line[i] = (line[i] + a) & 0xff;
      else if (filter === 2) line[i] = (line[i] + b) & 0xff;
      else if (filter === 3) line[i] = (line[i] + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        line[i] = (line[i] + pred) & 0xff;
      }
    }
    lines.push(line);
    prev = line;
  }
  const row = lines[py];
  if (!row) return null;
  const i = px * channels;
  return { r: row[i], g: row[i + 1], b: row[i + 2] };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
