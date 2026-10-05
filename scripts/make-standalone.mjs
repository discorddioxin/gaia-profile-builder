/**
 * Copies the production single-file build (`dist/index.html`) to a tracked path
 * so it survives sandbox restarts.
 *
 * Why a tracked copy: this project is built with `vite-plugin-singlefile`, so
 * `dist/index.html` is a complete offline app (all JS/CSS inlined). Ignored
 * paths (`dist/`, `node_modules/`, `.tmp/`) are dropped whenever the workspace
 * is restored, so the preview artifact is committed instead — it is the only
 * reliable way to hand someone a running copy of the builder.
 *
 * Usage: npm run build:single
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const source = path.join(ROOT, 'dist/index.html');
const targetDir = path.join(ROOT, 'preview');
const target = path.join(targetDir, 'gaia-profile-builder.html');

if (!fs.existsSync(source)) {
  console.error('dist/index.html not found — run `npm run build` first (or use `npm run build:single`).');
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);

const { size } = fs.statSync(target);
const html = fs.readFileSync(target, 'utf8');
// Sanity check: a standalone build must not reference local project files.
// Only markup outside <script> counts — bundled JS contains e.g. href="'+s+'".
const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const localRefs = [...markup.matchAll(/(?:src|href)="(?!https?:|data:|#)([^"]*)"/g)]
  .map((m) => m[1])
  .filter((ref) => ref && !ref.startsWith('{'));
console.log(
  `preview/gaia-profile-builder.html written — ${(size / 1024).toFixed(0)}KB` +
    (localRefs.length ? `\n  ⚠ ${localRefs.length} local reference(s): ${localRefs.slice(0, 5).join(', ')}` : ' (self-contained)')
);
