// Astro config used only by scripts/test-content.mjs: same as astro.config.mjs but without the
// Vercel adapter, so a test build never writes to .vercel/. The output folder comes from --outDir.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
