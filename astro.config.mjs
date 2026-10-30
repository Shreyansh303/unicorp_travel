// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// The site origin for canonical and Open Graph URLs, e.g. the preview URL (set in M8).
// Unset means pages emit no canonical, og:url or og:image rather than guess a domain.
const siteUrl = process.env.SITE_URL?.trim() || undefined;

// https://astro.build/config
export default defineConfig({
  ...(siteUrl ? { site: siteUrl } : {}),
  output: 'static',
  adapter: vercel(),
  integrations: [
    react(),
    {
      // client:afterpaint (src/lib/hydrate-after-paint.ts): client:visible that also waits for the
      // largest contentful paint, so a first-screen island does not delay it.
      name: 'hydrate-after-paint',
      hooks: {
        'astro:config:setup': ({ addClientDirective }) => {
          addClientDirective({
            name: 'afterpaint',
            entrypoint: './src/lib/hydrate-after-paint.ts',
          });
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
