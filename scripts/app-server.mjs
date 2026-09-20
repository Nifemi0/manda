import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
const envPath = resolve(root, '.env.local');
const readEnv = key => {
  if (process.env[key]) return process.env[key].trim();
  if (!existsSync(envPath)) return '';
  const line = readFileSync(envPath, 'utf8').split(/\r?\n/).find(item => item.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
};
const apiKey = readEnv('VITE_ALCHEMY_API_KEY');
const policyId = readEnv('VITE_ALCHEMY_GAS_POLICY_ID');
const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'
};
const requestBody = req => new Promise((resolveBody, reject) => {
  const chunks = [];
  let length = 0;
  req.on('data', chunk => {
    length += chunk.length;
    if (length > 1_000_000) { reject(new Error('Request too large')); req.destroy(); } else chunks.push(chunk);
  });
  req.on('end', () => resolveBody(Buffer.concat(chunks)));
  req.on('error', reject);
});
async function proxy(req, res, target, extraHeaders = {}) {
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await requestBody(req);
  const response = await fetch(target, {
    method: req.method,
    headers: { 'content-type': req.headers['content-type'] || 'application/json', authorization: req.headers.authorization || '', 'x-agent-session': req.headers['x-agent-session'] || '', ...extraHeaders },
    body
  });
  const headers = { 'content-type': response.headers.get('content-type') || 'application/octet-stream', 'cache-control': response.headers.get('cache-control') || 'no-store' };
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/agent/')) {
      return await proxy(req, res, `http://127.0.0.1:4174${url.pathname.slice('/api/agent'.length)}${url.search}`);
    }
    if (url.pathname === '/api/robinhood' || url.pathname === '/api/alchemy') {
      if (!apiKey || !policyId) throw new Error('Alchemy server configuration is missing.');
      const host = url.pathname === '/api/robinhood' ? 'robinhood-testnet.g.alchemy.com' : 'arb-sepolia.g.alchemy.com';
      return await proxy(req, res, `https://${host}/v2/${apiKey}`, { 'x-alchemy-policy-id': policyId });
    }
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = resolve(dist, requested);
    if (file !== dist && !file.startsWith(`${dist}${sep}`)) {
      res.writeHead(400); return res.end('Invalid path');
    }
    if (!existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': contentTypes[extname(file)] || 'application/octet-stream', 'cache-control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable' });
    res.end(readFileSync(file));
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Production app ready on http://127.0.0.1:${process.env.PORT || 4173}`));
