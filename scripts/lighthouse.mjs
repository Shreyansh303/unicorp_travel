// Lighthouse CI budget (mobile) against the built dist/. Builds first if dist/ is missing.
// If no system Chrome is found, points CHROME_PATH at Playwright's Chromium.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Launcher } from 'chrome-launcher';
import { chromium } from '@playwright/test';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
  run(npm, ['run', 'build']);
}

if (!process.env.CHROME_PATH && Launcher.getInstallations().length === 0) {
  const bundled = chromium.executablePath();
  if (existsSync(bundled)) {
    process.env.CHROME_PATH = bundled;
    console.log(`[lighthouse] No system Chrome found; using ${bundled}`);
  }
}

run(npx, ['lhci', 'autorun', '--config=./lighthouserc.json']);
