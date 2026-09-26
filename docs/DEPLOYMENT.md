# VPS deployment

Manda runs as two local Node services behind Nginx:

- the public application server listens on `127.0.0.1:4173`;
- the signing and policy service listens on `127.0.0.1:4174` and is reachable publicly only through the application server's guarded `/api/agent` proxy;
- systemd keeps both processes alive and restarts them after failures or reboots;
- mutable policy and activity data lives in `/var/lib/manda` outside the Git checkout;
- secrets live in `/etc/manda/manda.env`, readable only by `root` and the `manda` service group.

The production command is:

```bash
npm run build
npm run start:production
```

Required production environment values are documented in `.env.example`. `AGENT_PRIVATE_KEY` must resolve to the public delegated address in `frontend/agent-identity.json`. Reusing the existing delegated key preserves active mandates; replacing it requires the owner to register fresh mandates.

Copy `deploy/manda.service` to `/etc/systemd/system/manda.service` and `deploy/nginx.conf` to `/etc/nginx/sites-available/manda`. Enable the site, validate Nginx with `nginx -t`, then enable the service with `systemctl enable --now manda`.

Point a domain at the VPS before using Certbot. HTTPS is required before exposing agent credentials or using the production wallet flow.

The Vercel frontend uses the catch-all function at `api/agent/[...path].js`. Set `MANDA_BACKEND_ORIGIN` in Vercel to the HTTPS origin that exposes the private agent service. The proxy forwards only the documented Manda agent routes and never stores the delegated key.

Robinhood mandate installation and payments use `api/robinhood.js` as a same-origin JSON-RPC proxy. Set `ALCHEMY_API_KEY` and `ALCHEMY_GAS_POLICY_ID` as sensitive production environment variables in Vercel. The function permits only the bundler and sponsorship methods the wallet flow needs; these credentials must never be bundled into frontend assets. Deploy again after changing production environment variables.
