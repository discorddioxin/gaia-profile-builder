/**
 * Bundles and runs `ui-smoke.tsx` (jsdom walk of the builder session).
 *
 * esbuild and jsdom are intentionally **not** dependencies of the app — they are
 * only needed to run the checks:
 *   npm i --no-save --no-audit --no-fund esbuild jsdom
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const entry = path.join(ROOT, 'scripts/verify/ui-smoke.tsx');
const out = path.join(ROOT, 'node_modules/.cache/verify/ui-smoke.mjs');

for (const dep of ['esbuild', 'jsdom']) {
  if (!fs.existsSync(path.join(ROOT, 'node_modules', dep))) {
    console.error(`Missing '${dep}'. Install the check-only deps:\n  npm i --no-save --no-audit --no-fund esbuild jsdom`);
    process.exit(2);
  }
}

fs.mkdirSync(path.dirname(out), { recursive: true });
const build = spawnSync(
  path.join(ROOT, 'node_modules/.bin/esbuild'),
  [
    entry,
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--jsx=automatic',
    '--external:jsdom',
    '--alias:@=./src',
    '--loader:.css=empty',
    '--loader:.svg=dataurl',
    `--outfile=${out}`,
    '--log-level=error',
  ],
  { cwd: ROOT, stdio: 'inherit' }
);
if (build.status !== 0) process.exit(build.status ?? 1);

const run = spawnSync(process.execPath, [out], { cwd: ROOT, stdio: 'inherit' });
process.exit(run.status ?? 1);
