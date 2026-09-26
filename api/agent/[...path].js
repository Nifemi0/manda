const routes = new Map([
  ['/status', new Set(['GET'])],
  ['/capabilities', new Set(['GET'])],
  ['/auth/challenge', new Set(['GET'])],
  ['/auth/verify', new Set(['POST'])],
  ['/activity', new Set(['GET'])],
  ['/policy', new Set(['GET', 'POST'])],
  ['/pay', new Set(['POST'])]
]);

function requestBody(request) {
  if (request.body == null) return undefined;
  if (Buffer.isBuffer(request.body) || typeof request.body === 'string') return request.body;
  return JSON.stringify(request.body);
}

export default async function handler(request, response) {
  const incoming = new URL(request.url, 'https://manda.invalid');
  const route = incoming.pathname.replace(/^\/api\/agent/, '') || '/';
  if (!routes.get(route)?.has(request.method)) {
    return response.status(404).json({ error: 'Not found' });
  }

  const origin = process.env.MANDA_BACKEND_ORIGIN?.replace(/\/$/, '');
  if (!origin) return response.status(503).json({ error: 'Manda agent service is not configured.' });

  const target = `${origin}${route}${incoming.search}`;
  const headers = { accept: 'application/json' };
  for (const name of ['authorization', 'content-type', 'x-agent-session']) {
    if (request.headers[name]) headers[name] = request.headers[name];
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : requestBody(request),
      signal: AbortSignal.timeout(55_000)
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    response.status(upstream.status);
    response.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    response.setHeader('cache-control', 'no-store');
    return response.send(body);
  } catch {
    return response.status(502).json({ error: 'Manda agent service is temporarily unavailable.' });
  }
}

export const config = { maxDuration: 60 };
