import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const secretPath = new URL('../.agent-key.local', import.meta.url);
const publicPath = new URL('../frontend/agent-identity.json', import.meta.url);
const serviceSecretPath = new URL('../.service-key.local', import.meta.url);
const servicePublicPath = new URL('../frontend/demo-service.json', import.meta.url);
const privateKey = existsSync(secretPath)
  ? readFileSync(secretPath, 'utf8').trim()
  : generatePrivateKey();

if (!existsSync(secretPath)) writeFileSync(secretPath, `${privateKey}\n`, { mode: 0o600 });
const account = privateKeyToAccount(privateKey);
writeFileSync(publicPath, `${JSON.stringify({ address: account.address, keyType: 'secp256k1', custody: 'local-agent-service' }, null, 2)}\n`);
console.log(`Agent identity ready: ${account.address}`);

const servicePrivateKey = existsSync(serviceSecretPath)
  ? readFileSync(serviceSecretPath, 'utf8').trim()
  : generatePrivateKey();
if (!existsSync(serviceSecretPath)) writeFileSync(serviceSecretPath, `${servicePrivateKey}\n`, { mode: 0o600 });
const serviceAccount = privateKeyToAccount(servicePrivateKey);
writeFileSync(servicePublicPath, `${JSON.stringify({ name: 'Model inference endpoint', address: serviceAccount.address, keyType: 'secp256k1' }, null, 2)}\n`);
console.log(`Demo service ready: ${serviceAccount.address}`);
