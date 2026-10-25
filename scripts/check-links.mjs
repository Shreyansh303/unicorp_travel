// Link checker for the built site (roadmap section 9: no dead buttons and no "#" links).
// Crawls every HTML file in dist/ and fails on:
//   - an internal href, src or srcset URL that does not resolve to a built file,
//   - a fragment (#id) that does not exist on the target page,
//   - an empty href, href="#", a javascript: href, or an <a> without an href,
//   - a malformed external link: tel: must be tel:+91..., wa.me must use the WhatsApp number in
//     src/config/site.ts, mailto: must hold an address, http links must be https and parse.
// Usage: node scripts/check-links.mjs [dir]   (default: dist)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shown, site } from '../src/config/site.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const distDir = resolve(root, process.argv[2] ?? 'dist');
const origin = 'http://site.invalid';

if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`No built site in ${relative(root, distDir) || distDir}. Run npm run build first.`);
  process.exit(1);
}

const mobile = shown(site.phones.mobile);
const whatsappDigits = mobile ? mobile.e164.replace(/^\+/, '') : null;

/** Every .html file under a folder. */
function htmlFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...htmlFiles(path));
    else if (name.endsWith('.html')) found.push(path);
  }
  return found;
}

/** The URL path a built file is served at: dist/about/index.html is /about/. */
function pagePath(file) {
  const rel = relative(distDir, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

/** Built file for a URL path, or null. /about, /about/ and /about/index.html all match. */
function fileFor(pathname) {
  const clean = decodeURIComponent(pathname);
  const candidates = clean.endsWith('/')
    ? [`${clean}index.html`]
    : [clean, `${clean}/index.html`, `${clean}.html`];
  for (const candidate of candidates) {
    const path = join(distDir, ...candidate.split('/').filter(Boolean));
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}

/** Markup without comments, script bodies and style bodies, so their text is not read as links. */
function markupOnly(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

const attrPattern = /\s(href|src|srcset|id)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
const tagPattern = /<([a-z][a-z0-9-]*)\b([^>]*)>/gi;

/** Parses one page into its links and ids. */
function parse(file) {
  const html = markupOnly(readFileSync(file, 'utf8'));
  const links = [];
  const ids = new Set();
  const anchorsWithoutHref = [];
  for (const tag of html.matchAll(tagPattern)) {
    const name = tag[1].toLowerCase();
    const attrs = tag[2];
    let hasHref = false;
    for (const attr of attrs.matchAll(attrPattern)) {
      const key = attr[1].toLowerCase();
      const value = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '');
      if (key === 'id') {
        ids.add(value);
      } else if (key === 'srcset') {
        // A single inline image (a placeholder pixel) has a comma of its own; it is not a link.
        if (value.trim().startsWith('data:image/')) continue;
        for (const candidate of value.split(',')) {
          const url = candidate.trim().split(/\s+/)[0];
          if (url) links.push({ tag: name, attr: key, url });
        }
      } else {
        if (key === 'href') hasHref = true;
        links.push({ tag: name, attr: key, url: value });
      }
    }
    if (name === 'a' && !hasHref) anchorsWithoutHref.push(tag[0].slice(0, 80));
  }
  return { links, ids, anchorsWithoutHref };
}

const files = htmlFiles(distDir).sort();
const pages = new Map(files.map((file) => [file, parse(file)]));

const failures = [];
const counts = { internal: 0, fragment: 0, tel: 0, whatsapp: 0, mailto: 0, maps: 0, other: 0 };
const fail = (file, message) => failures.push(`${pagePath(file)}: ${message}`);

function checkExternal(file, { attr, url }) {
  // An inline image (e.g. a transparent placeholder pixel) is data, not a link.
  if (attr !== 'href' && url.startsWith('data:image/')) return;
  if (url.startsWith('tel:')) {
    counts.tel += 1;
    if (!/^tel:\+91\d{10}$/.test(url)) fail(file, `malformed tel link "${url}" (use tel:+91...)`);
    return;
  }
  if (url.startsWith('mailto:')) {
    counts.mailto += 1;
    if (!/^mailto:[^@\s?]+@[^@\s?]+\.[a-z]{2,}(\?\S*)?$/i.test(url)) {
      fail(file, `malformed mailto link "${url}"`);
    }
    return;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail(file, `${attr} is not a valid URL: "${url}"`);
    return;
  }
  if (parsed.protocol !== 'https:') {
    fail(file, `external link must use https: "${url}"`);
    return;
  }
  if (parsed.hostname === 'wa.me' || parsed.hostname.endsWith('whatsapp.com')) {
    counts.whatsapp += 1;
    if (!whatsappDigits) fail(file, `WhatsApp link "${url}" but no WhatsApp number in site.ts`);
    else if (parsed.hostname !== 'wa.me' || parsed.pathname !== `/${whatsappDigits}`) {
      fail(file, `WhatsApp link must be https://wa.me/${whatsappDigits}: "${url}"`);
    }
    return;
  }
  if (/(^|\.)google\.[a-z.]+$/.test(parsed.hostname) && parsed.pathname.startsWith('/maps')) {
    counts.maps += 1;
    if (!parsed.searchParams.get('query')) fail(file, `Google Maps link without a query: "${url}"`);
    return;
  }
  counts.other += 1;
}

for (const [file, page] of pages) {
  for (const snippet of page.anchorsWithoutHref) fail(file, `<a> without href: ${snippet}`);

  for (const link of page.links) {
    const { attr, url } = link;
    if (attr === 'href' && url.trim() === '') {
      fail(file, `empty href on <${link.tag}>`);
      continue;
    }
    if (url === '#') {
      fail(file, `href="#" on <${link.tag}>`);
      continue;
    }
    if (/^\s*javascript:/i.test(url)) {
      fail(file, `javascript: link "${url}"`);
      continue;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) {
      checkExternal(file, link);
      continue;
    }

    // Internal: resolve against the page's own URL, then find the file and the fragment.
    const target = new URL(url, `${origin}${pagePath(file)}`);
    const targetFile = url.startsWith('#') ? file : fileFor(target.pathname);
    if (url.startsWith('#')) counts.fragment += 1;
    else counts.internal += 1;
    if (!targetFile) {
      fail(file, `broken ${attr} "${url}" (no file for ${target.pathname})`);
      continue;
    }
    const fragment = decodeURIComponent(target.hash.slice(1));
    if (fragment) {
      const targetPage = pages.get(targetFile);
      if (targetPage && !targetPage.ids.has(fragment)) {
        fail(file, `${attr} "${url}" points to #${fragment}, which is not on that page`);
      }
    }
  }
}

const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
console.log(`Checked ${files.length} pages and ${total} links in ${relative(root, distDir)}/`);
console.log(
  `  internal ${counts.internal}, in-page ${counts.fragment}, tel ${counts.tel}, ` +
    `WhatsApp ${counts.whatsapp}, mailto ${counts.mailto}, Google Maps ${counts.maps}, ` +
    `other external ${counts.other}`,
);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'} found:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('  0 broken links, 0 "#" or empty hrefs, 0 javascript: links');
