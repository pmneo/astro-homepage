# astro-homepage

Single-scroll astrophotography site: a scroll-driven night-sky/telescope background, a garden
observatory writeup, an equipment list, a gallery synced live from AstroBin, an Aladin sky map of
plate-solved fields, and a tool for any visitor to look up their own AstroBin gallery the same way.

## Structure

- `src/lib/astrobin.ts` — server-side AstroBin client (resolves usernames, fetches galleries and
  plate-solve data, caches results in memory for an hour). Ported from KStarsCluster's
  `AstrobinProxyServlet.java`, generalized to any username instead of one hardcoded account.
- `src/app/api/astrobin/[username]/...` — route handlers wrapping that client; called by the
  client components below instead of hitting AstroBin directly (its API has no CORS headers).
- `src/content/site.ts` — the non-AstroBin content (name, location, about text, equipment list,
  PayPal business id). Edit this to make the site yours.
- `src/components/` — one component per section, plus `Starfield.tsx` (fixed canvas background)
  and `TelescopeRig.tsx` (the scroll-rotated telescope silhouette).

## Local development

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_PAYPAL_BUSINESS to enable the donate button
npm run dev
```

Edit `src/content/site.ts` for your own bio/location/equipment, and `src/app/layout.tsx`'s
`metadata` / `Nav.tsx`'s brand text if you're not "pmneo".

## Deploying to a self-hosted server via Plesk

This app builds with `output: "standalone"` (see `next.config.ts`), which produces a minimal,
self-contained `server.js` plus a pruned `node_modules` — exactly the shape Plesk's **Node.js
Toolkit** (Passenger-based) expects, without needing a container or a full source checkout on the
server.

1. **Domain → Node.js Toolkit**: in Plesk, open the domain, enable the *Node.js* extension, and
   point *Application Root* at this repo's checkout and *Application Startup File* at
   `.next/standalone/server.js`.
2. **Build on deploy**: set the toolkit's custom "run script" (or the Git deployment hook below) to:
   ```bash
   npm ci
   npm run build
   cp -r public .next/standalone/public
   cp -r .next/static .next/standalone/.next/static
   ```
   (`standalone` doesn't copy `public/` or the static asset folder itself — Next expects you to
   place them next to the generated `server.js`.)
3. **Environment variables**: set `NEXT_PUBLIC_PAYPAL_BUSINESS` (and `PORT`/`HOSTNAME` if you need
   non-default values) in the Node.js Toolkit's environment variables panel, not just `.env.local`
   — Passenger doesn't read dotfiles by default.
4. **Restart**: Plesk's Node.js Toolkit restarts the app automatically when you save its settings,
   or via "Restart App" in its UI.

### Auto-deploy on `git push`

Use Plesk's **Git** extension to connect this repo (as a remote you push to, or pulling from
GitHub) and set its deployment action to the same three commands as step 2 above, followed by
touching Passenger's restart file:

```bash
npm ci
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
mkdir -p .next/standalone/tmp && touch .next/standalone/tmp/restart.txt
```

Once wired up, `git push` to the connected branch rebuilds and restarts the live site with no
manual server access needed.
