#!/usr/bin/env node
/**
 * Copies only the Ionicons SVGs this project references into assets/vendor/ionicons/svg.
 * Usage:  node tools/vendor-icons.js [--src path/to/ionicons/dist/ionicons/svg]
 * Default source: node_modules/ionicons/dist/ionicons/svg  (npm i ionicons@7.4.0)
 * Re-run whenever you add a new <ion-icon name="..."> to the project.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const argIdx = process.argv.indexOf('--src');
const src = argIdx > -1 ? path.resolve(process.argv[argIdx + 1]) : path.join(root, 'node_modules/ionicons/dist/ionicons/svg');
const dest = path.join(root, 'assets/vendor/ionicons/svg');
if (!fs.existsSync(src)) { console.error(`Ionicons SVG source not found: ${src}\nRun: npm i ionicons@7.4.0  (or pass --src)`); process.exit(1); }

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (['node_modules', '.git', 'vendor', 'fonts'].includes(f)) continue;
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.(html|js)$/.test(f)) out.push(p);
  }
  return out;
}
const available = new Set(fs.readdirSync(src).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)));
const used = new Set();
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(/['"`]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)['"`]/g)) if (available.has(m[1])) used.add(m[1]);
}
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(dest)) if (!used.has(f.slice(0, -4))) fs.unlinkSync(path.join(dest, f));
let copied = 0;
for (const name of used) { fs.copyFileSync(path.join(src, `${name}.svg`), path.join(dest, `${name}.svg`)); copied++; }
console.log(`Vendored ${copied} icons → ${path.relative(root, dest)}`);
