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
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
