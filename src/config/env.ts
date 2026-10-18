/**
 * Demo flag. On by default; only the exact string "false" turns it off.
 * The same rule is applied in scripts/vercel-noindex-header.mjs.
 */
export const DEMO: boolean = process.env['DEMO'] !== 'false';
