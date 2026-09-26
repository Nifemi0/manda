const allowedMethods = new Set([
  'eth_chainId',
  'eth_supportedEntryPoints',
  'eth_estimateUserOperationGas',
  'eth_sendUserOperation',
  'eth_getUserOperationReceipt',
  'eth_getUserOperationByHash',
  'alchemy_requestGasAndPaymasterAndData'
]);

export default async function handler(request, response) {
  response.setHeader('cache-control', 'no-store');
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' });

  let payload;
  try {
    payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ error: 'Invalid JSON-RPC request' });
  }
  if (!payload || Array.isArray(payload) || payload.jsonrpc !== '2.0' || !allowedMethods.has(payload.method) || !Array.isArray(payload.params)) {
    return response.status(400).json({ error: 'Unsupported JSON-RPC method' });
  }

  const apiKey = process.env.ALCHEMY_API_KEY;
  const policyId = process.env.ALCHEMY_GAS_POLICY_ID;
  if (!apiKey || !policyId) return response.status(503).json({ error: 'Robinhood bundler is not configured' });

  try {
    const upstream = await fetch(`https://robinhood-testnet.g.alchemy.com/v2/${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-alchemy-policy-id': policyId },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55_000)
    });
    response.status(upstream.status);
    response.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    return response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    return response.status(502).json({ error: 'Robinhood bundler is temporarily unavailable' });
  }
}

export const config = { maxDuration: 60 };
