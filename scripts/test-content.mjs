// Checks the demo-content rule (roadmap section 5) end to end with real builds:
//   1. DEMO=false must FAIL, and its message must name every entry that has demo: true.
//   2. The default build (DEMO unset, so on) must PASS.
// Builds go to a temporary folder and use a config without the Vercel adapter, so dist/ and
// .vercel/ are never touched. Plain Node, so it runs the same on Windows, macOS and Linux.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const astroBin = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const config = 'scripts/astro.content-test.config.mjs'; // relative to --root
// Inside the project (git-ignored node_modules) so the build can rename files on the same drive.
const tempRoot = join(root, 'node_modules', '.cache');
mkdirSync(tempRoot, { recursive: true });
const outDir = mkdtempSync(join(tempRoot, 'content-test-'));
// eslint-disable-next-line no-control-regex
const stripAnsi = (text) => text.replace(/\u001b\[[0-9;]*m/g, '');

/** Every entry whose file sets a top-level `demo: true`, as "collection/id". */
function expectedDemoEntries() {
  const found = [];
  for (const collection of ['services', 'packages', 'faqs', 'legal']) {
    const dir = join(root, 'src', 'content', collection);
    for (const file of readdirSync(dir).sort()) {
      if (/^demo:\s*true\s*(#.*)?$/m.test(readFileSync(join(dir, file), 'utf8'))) {
        found.push(`${collection}/${file.replace(/\.[^.]+$/, '')}`);
      }
    }
  }
  return found;
}

function build(demo) {
  const env = { ...process.env, NO_COLOR: '1' };
  if (demo === undefined) delete env.DEMO;
  else env.DEMO = demo;
  const result = spawnSync(
    process.execPath,
    [astroBin, 'build', '--root', root, '--config', config, '--outDir', outDir],
    { env, encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 },
  );
  return {
    status: result.status,
    output: stripAnsi(`${result.stdout ?? ''}\n${result.stderr ?? ''}`),
  };
}

const failures = [];
try {
  const expected = expectedDemoEntries();
  const blocked = build('false');
  if (expected.length === 0) {
    failures.push('No content has demo: true, so the DEMO=false check has nothing to prove.');
  } else if (blocked.status === 0) {
    failures.push('DEMO=false build succeeded, but it must fail while demo: true content exists.');
  } else {
    const missing = expected.filter((name) => !blocked.output.includes(name));
    if (!blocked.output.includes('demo: true')) {
      failures.push(
        `DEMO=false build failed, but the message does not mention demo: true.\n${blocked.output.slice(-1500)}`,
      );
    } else if (missing.length > 0) {
      failures.push(
        `DEMO=false message does not name every demo entry. Missing: ${missing.join(', ')}`,
      );
    } else if (!blocked.output.includes(`${expected.length} content entries have demo: true`)) {
      failures.push(
        `DEMO=false message does not state the count (${expected.length}).\n${blocked.output.slice(-800)}`,
      );
    } else {
      console.log(`ok  DEMO=false build fails and names all ${expected.length} demo entries`);
    }
  }

  const normal = build(undefined);
  if (normal.status !== 0) {
    failures.push(`Default build failed (exit ${normal.status}).\n${normal.output.slice(-2000)}`);
  } else {
    console.log('ok  default build passes (content, schemas and photo paths all valid)');
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
