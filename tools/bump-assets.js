#!/usr/bin/env node
/**
 * Stamps every local stylesheet / script reference in the site's HTML with
 * ?v=<stamp> so browsers fetch fresh assets after each deploy, even if an old
 * copy is cached.  Run it after changing anything under assets/:
 *
 *   node tools/bump-assets.js            # stamp = current date-time
 *   node tools/bump-assets.js 42         # explicit stamp
 */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const stamp = process.argv[2] || new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    if (['node_modules', '.git', 'assets', 'tools', '.netlify'].includes(f)) continue;
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.html')) out.push(p);
  }
  return out;
}
const re = /((?:href|src)=")((?:\.\.\/|\/)?assets\/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?(")/g;
let files = 0, refs = 0;
for (const file of walk(root)) {
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(re, (m, a, url, b) => { refs++; return `${a}${url}?v=${stamp}${b}`; });
  if (after !== before) { fs.writeFileSync(file, after); files++; }
}
console.log(`Stamped ${refs} asset references in ${files} HTML files with v=${stamp}`);
