import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    root: 'frontend',
    envDir: '..',
    server: {
      proxy: {
        '/api/agent': {
          target: 'http://127.0.0.1:4174',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/agent/, '')
        },
        '/api/robinhood': {
          target: 'https://robinhood-testnet.g.alchemy.com',
          changeOrigin: true,
          headers: { 'x-alchemy-policy-id': env.VITE_ALCHEMY_GAS_POLICY_ID },
          rewrite: () => `/v2/${env.VITE_ALCHEMY_API_KEY}`
        },
        '/api/alchemy': {
          target: 'https://arb-sepolia.g.alchemy.com',
          changeOrigin: true,
          headers: { 'x-alchemy-policy-id': env.VITE_ALCHEMY_GAS_POLICY_ID },
          rewrite: () => `/v2/${env.VITE_ALCHEMY_API_KEY}`
        }
      }
    },
    build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'frontend/index.html'),
        onboarding: resolve(import.meta.dirname, 'frontend/onboarding.html'),
        control: resolve(import.meta.dirname, 'frontend/app.html')
      }
    }
    }
  };
});
