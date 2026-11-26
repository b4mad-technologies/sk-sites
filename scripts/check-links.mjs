#!/usr/bin/env node
// Checks that every relative link in the tracked Markdown files points to a
// file or directory that exists in this repository. No network access, no
// dependencies. Links with a scheme (https:, mailto:), pure #anchors and
// site-absolute paths (/play) are not checked.
//
// Usage: node scripts/check-links.mjs
// A line "<file>: <target>" in scripts/check-links.ignore skips that link.

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignoreFile = join(root, 'scripts', 'check-links.ignore');
const ignored = new Set(
  existsSync(ignoreFile)
    ? readFileSync(ignoreFile, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
    : [],
);

const files = execFileSync('git', ['ls-files', '-z', '--', '*.md'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  // A symlinked file (CLAUDE.md -> AGENTS.md) is checked once, at its target.
  .filter((file) => !lstatSync(join(root, file)).isSymbolicLink())
  .sort();

// [text](target "title"), ![alt](target) and reference definitions [id]: target
const inline = /\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+["'(][^)]*)?\)/g;
const definition = /^\s{0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/;

function targetsOf(text) {
  const found = [];
  let fence = null;
  text.split('\n').forEach((raw, index) => {
    const marker = raw.match(/^\s*(```+|~~~+)/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
      return;
    }
    if (fence) return;
    const line = raw.replace(/`[^`]*`/g, '');
    for (const match of line.matchAll(inline)) found.push([index + 1, match[1]]);
    const def = line.match(definition);
    if (def) found.push([index + 1, def[1]]);
  });
  return found;
}

const dead = [];
let checked = 0;
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const [line, rawTarget] of targetsOf(text)) {
    const target = rawTarget.replace(/^<|>$/g, '');
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) continue;
    const path = target.split(/[?#]/)[0];
    if (!path) continue;
    if (ignored.has(`${file}: ${target}`)) continue;
    checked += 1;
    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      // keep the raw path
    }
    const resolved = resolve(root, dirname(file), decoded);
    const inside = !relative(root, resolved).startsWith('..');
    if (!inside || !existsSync(resolved)) dead.push(`${file}:${line}: ${target}`);
  }
}

if (dead.length > 0) {
  console.error(dead.join('\n'));
  console.error(`\n${dead.length} dead relative link(s) in ${files.length} Markdown files.`);
  process.exit(1);
}
console.log(`${checked} relative links in ${files.length} Markdown files: all resolve.`);
