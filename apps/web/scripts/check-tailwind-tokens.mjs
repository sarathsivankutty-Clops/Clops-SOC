#!/usr/bin/env node
/**
 * Fails when a `var(--x)` referenced by tailwind.config.ts has no definition
 * in the CSS under src/, or when a themeable colour token (brand, ai, surface,
 * fg, border) is defined in only one of the dark/light theme blocks.
 *
 * Variables supplied at runtime by next/font (`--font-*`) are exempt.
 * Run: node scripts/check-tailwind-tokens.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = readFileSync(join(root, 'tailwind.config.ts'), 'utf8');

const referenced = new Set(
  [...config.matchAll(/var\((--[a-z0-9-]+)/gi)].map((m) => m[1]),
);

function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return cssFiles(p);
    return p.endsWith('.css') ? [p] : [];
  });
}

const css = cssFiles(join(root, 'src')).map((p) => readFileSync(p, 'utf8')).join('\n');
const defined = (name) => new RegExp(`(^|[\\s;{])${name}\\s*:`, 'm').test(css);

// Split globals.css into the dark (:root + [data-theme="dark"]) and light blocks.
const globals = readFileSync(join(root, 'src/app/globals.css'), 'utf8');
const blocks = (selectorRe) =>
  [...globals.matchAll(new RegExp(`${selectorRe}\\s*\\{([^}]*)\\}`, 'g'))]
    .map((m) => m[1])
    .join('\n');
const dark = blocks(':root,\\s*\\[data-theme="dark"\\]');
const light = blocks('\\[data-theme="light"\\]');
const inBlock = (block, name) => new RegExp(`${name}\\s*:`).test(block);

const themeable = /^--(brand|ai-accent|surface|fg|border)/;
const problems = [];
for (const name of [...referenced].sort()) {
  if (name.startsWith('--font-')) continue;
  if (!defined(name)) {
    problems.push(`${name}: referenced by tailwind.config.ts but not defined in any CSS`);
    continue;
  }
  if (themeable.test(name)) {
    if (!inBlock(dark, name)) problems.push(`${name}: missing from dark theme block`);
    if (!inBlock(light, name)) problems.push(`${name}: missing from light theme block`);
  }
}

if (problems.length) {
  console.error('Tailwind token check FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`Tailwind token check passed (${referenced.size} variables referenced).`);
