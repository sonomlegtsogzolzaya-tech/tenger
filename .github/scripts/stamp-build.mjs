// Task B32: stamps one build version into static/index.html so a new deploy never runs with old cached files.
// GitHub Pages lets browsers cache every file for 10 minutes and our file names never change, so after a deploy a
// browser could combine the new index.html with old modules (raw string keys, "Cannot read properties of null").
// This writes:
//   - <meta name="build" content="VERSION"> (js/dom.js reads it and adds ?v=VERSION to every data/ request);
//   - an import map that maps every module under js/ and vendor/ to <file>?v=VERSION (static and dynamic imports);
//   - ?v=VERSION on every stylesheet in css/ and on the main script.
// Usage: node .github/scripts/stamp-build.mjs <static dir> <version>
//   The Publish site workflow runs it with the commit before uploading; the committed index.html carries "dev".
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export function modulesUnder(root, folders = ['js', 'vendor']) {
  const found = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.js')) found.push(relative(root, path).split(sep).join('/'));
    }
  };
  for (const folder of folders) walk(join(root, folder));
  return found;
}

export function stamp(html, modules, version) {
  if (!/^[\w.-]+$/.test(version)) throw new Error(`bad build version: ${version}`);
  const map = { imports: Object.fromEntries(modules.map((path) => [`./${path}`, `./${path}?v=${version}`])) };
  const block = `<script type="importmap" id="build-map">${JSON.stringify(map)}</script>`;
  let out = html.replace(/<meta name="build" content="[^"]*">/, `<meta name="build" content="${version}">`);
  out = out.replace(/<script type="importmap" id="build-map">[\s\S]*?<\/script>/, block);
  out = out.replace(/(<link rel="stylesheet" href="css\/[\w.-]+\.css)(\?v=[^"]*)?"/g, `$1?v=${version}"`);
  out = out.replace(/(<script type="module" src="js\/[\w-]+\.js)(\?v=[^"]*)?"/g, `$1?v=${version}"`);
  for (const [name, test] of [['build meta', `content="${version}"`], ['import map', 'id="build-map"'], ['main script', `js/main.js?v=${version}`]]) {
    if (!out.includes(test)) throw new Error(`index.html: no ${name} to stamp`);
  }
  return out;
}

// Run as a script (not imported): compare URLs, since import.meta.url is percent-encoded (a space is %20).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [root, version] = process.argv.slice(2);
  if (!root || !version) {
    console.error('usage: node .github/scripts/stamp-build.mjs <static dir> <version>');
    process.exit(2);
  }
  const file = join(root, 'index.html');
  const modules = modulesUnder(root);
  writeFileSync(file, stamp(readFileSync(file, 'utf8'), modules, version));
  console.log(`stamped ${file} with ${version}: ${modules.length} modules`);
}
