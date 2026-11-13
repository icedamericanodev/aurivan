/* Serves a built _site/ folder the way Cloudflare does, closely enough to
   test it: the rules in _site/_headers are applied (values for the same header
   name from every matching rule are JOINED, as Cloudflare does), /x serves
   x.html, and a missing address gets 404.html with status 404.
   Dev-only, no dependencies:  node scripts/home_page/serve_site.cjs [_site] [8787] */
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.argv[2] || '_site');
const port = Number(process.argv[3] || 8787);
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', ico: 'image/x-icon', woff2: 'font/woff2', txt: 'text/plain; charset=utf-8' };

function loadRules() {
  const rules = [];
  let cur = null;
  for (const line of fs.readFileSync(path.join(root, '_headers'), 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: [] }; rules.push(cur); }
    else if (cur) { const i = line.indexOf(':'); cur.headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]); }
  }
  return rules;
}
function matches(pattern, urlPath) {
  const re = new RegExp('^' + pattern.split('*').map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return re.test(urlPath);
}
function headersFor(urlPath) {
  const joined = {};
  for (const rule of loadRules()) {
    if (!matches(rule.pattern, urlPath)) continue;
    for (const [name, value] of rule.headers) joined[name] = joined[name] ? joined[name] + ', ' + value : value;
  }
  return joined;
}
function resolve(urlPath) {
  const clean = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  for (const candidate of [clean, clean + '.html', path.join(clean, 'index.html')]) {
    const file = path.join(root, candidate);
    if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}
http.createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://x').pathname;
  let file = resolve(urlPath);
  let status = 200;
  if (!file) { file = path.join(root, '404.html'); status = 404; }
  const headers = headersFor(urlPath);
  headers['Content-Type'] = TYPES[path.extname(file).slice(1)] || 'application/octet-stream';
  res.writeHead(status, headers);
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`serving ${root} with its _headers on http://localhost:${port}`));
