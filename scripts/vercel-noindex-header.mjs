// Runs after `astro build`. Adds an X-Robots-Tag header route to the Vercel Build Output API
// config (.vercel/output/config.json) when the demo flag is on. Same rule as src/config/env.ts:
// only the exact string "false" turns DEMO off.
import { readFileSync, writeFileSync } from 'node:fs';

const configPath = new URL('../.vercel/output/config.json', import.meta.url);
const demo = process.env.DEMO !== 'false';
const HEADER_KEY = 'X-Robots-Tag';

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const routes = Array.isArray(config.routes) ? config.routes : [];

// Remove any earlier copy so the script is idempotent and DEMO=false leaves no header.
const cleaned = routes.filter((route) => !(route.headers && HEADER_KEY in route.headers));

if (demo) {
  // `continue: true` lets later routes (filesystem, 404) still serve the response.
  cleaned.unshift({
    src: '/(.*)',
    headers: { [HEADER_KEY]: 'noindex, nofollow' },
    continue: true,
  });
}

config.routes = cleaned;
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(
  `[noindex] DEMO=${demo ? 'on' : 'off'}: ${HEADER_KEY} header ${demo ? 'added' : 'not added'}`,
);
