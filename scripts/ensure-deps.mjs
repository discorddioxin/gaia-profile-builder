#!/usr/bin/env node
/**
 * Sandbox/dev safety net: `node_modules` is not part of the repository snapshot,
 * so after a workspace restart `npm run dev` would die instantly with
 * "vite: not found" and the preview would close immediately.
 *
 * This pre-step reinstalls dependencies only when they are missing or incomplete.
 */
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = ['vite', 'react', 'react-dom', '@vitejs/plugin-react', 'tailwindcss'];
const missing = required.filter((pkg) => !existsSync(resolve(root, 'node_modules', pkg)));

if (missing.length === 0) {
  process.exit(0);
}

console.log(`[ensure-deps] missing: ${missing.join(', ')} — installing…`);
const result = spawnSync('npm', ['install', '--no-audit', '--no-fund'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.error('[ensure-deps] npm install failed.');
  process.exit(result.status ?? 1);
}
console.log('[ensure-deps] dependencies ready.');
