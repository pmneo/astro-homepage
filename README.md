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
- `src/components/` — one component per section, plus `ObservatoryVideo.tsx` (the scroll-scrubbed
  background footage).

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
2. **`.env.local` in the application root** — every env var this app uses (build-time and
   runtime alike) lives in one `.env.local` file, placed directly in the application root
   (next to `package.json`), not configured anywhere in Plesk's own UI:
   ```
   NEXT_PUBLIC_PAYPAL_BUSINESS=you@example.com
   GIT_REPO=/var/www/vhosts/pmneo.de/git/astro-homepage.git
   CACHE_EVICT_SECRET=...
   OBSERVATORY_STATUS_SECRET=...
   STATS_DIR=/var/www/vhosts/pmneo.de/persistent-stats
   CACHE_DIR=/var/www/vhosts/pmneo.de/persistent-cache
   ```
   This works because of two separate things, both handled by Next.js itself, not Plesk:
   - `next build` loads `.env.local` into `process.env` *before* even evaluating
     `next.config.ts` (confirmed against this Next.js version's own bundled source,
     `build/index.js`'s `load-dotenv` step runs before `load-next-config`) — so both
     `NEXT_PUBLIC_PAYPAL_BUSINESS` (inlined into the client bundle) and `GIT_REPO` (read by
     `getGitSha()` below) see it automatically, no Plesk panel involved at all.
   - The *running* server (`.next/standalone/server.js`, what Passenger actually starts) also
     auto-loads `.env.local` from its own directory at startup, the same way `next start` would
     — but `next build` only copies `.env`/`.env.production` into `.next/standalone/`
     automatically, **not** `.env.local`. Step 3 below copies it there explicitly.

   This replaces the previous setup (some vars in Plesk's Node.js Toolkit panel, some in
   `.env.local`, and it was never obvious which was which) with one single file and one single
   loading mechanism.
3. **Build on deploy**: set the toolkit's custom "run script" (or the Git deployment hook below) to:
   ```bash
   npm ci
   npm run build
   cp -r public .next/standalone/public
   cp -r .next/static .next/standalone/.next/static
   cp .env.local .next/standalone/.env.local
   ```
   (`standalone` doesn't copy `public/`, the static asset folder, or `.env.local` itself — Next
   expects you to place all three next to the generated `server.js`.)
4. **Restart**: Plesk's Node.js Toolkit restarts the app automatically when you save its settings,
   or via "Restart App" in its UI. For an *automated* restart from a deploy script, see the
   "Restarting after a deploy" note below — touching Passenger's usual `tmp/restart.txt` turned
   out not to work in this particular setup.

**A caveat worth checking once**: if your Plesk Git deployment wipes untracked/gitignored files on
every deploy (this project's own `.cache/` doesn't survive one, see `src/lib/diskCache.ts`),
`.env.local` in the application root won't survive either, and you'd need to re-place it after
every single push. If that turns out to be the case for your setup, keep a copy of `.env.local`
somewhere outside the deployed tree and add a `cp /path/outside/.env.local .env.local` as the
first line of the deploy script below, before `npm ci`.

### Showing the deployed commit in the footer

`next.config.ts` inlines the running build's short git SHA into `NEXT_PUBLIC_GIT_SHA` (see
`Footer.tsx`) by running `git rev-parse --short HEAD` at build time. That works fine for local
dev/builds, but fails in Plesk: the Git extension deploys this app's files into the *application
root* by copying them without a `.git` directory, so there's nothing there for `git rev-parse` to
find, and it silently falls back to `"unknown"`.

`GIT_REPO` (from `.env.local`, see above) points it at the Git extension's own bare repo clone
instead:

```
GIT_REPO=/var/www/vhosts/pmneo.de/git/astro-homepage.git
```

`next.config.ts` then runs `git -C "$GIT_REPO" rev-parse --short HEAD` instead of a plain
`git rev-parse` — works on a bare repo too, no working tree needed — reading the SHA straight from
the repo Plesk itself deployed from, rather than e.g. asking GitHub's API for "the latest commit
on main" (which would only be a guess at what's live, wrong the moment a deploy lags behind a push
or a non-`main` ref is what's actually checked out).

### Restarting after a deploy

Passenger's usual convention — touching `tmp/restart.txt` next to the app so the next request
picks up a fresh worker — didn't actually restart anything in this setup (confirmed: the site kept
serving the old build indefinitely; only manually killing the running server process by PID made
Passenger spawn a new one with the new build). Whatever's watching for restarts in this particular
Node.js Toolkit configuration isn't `tmp/restart.txt`, so the deploy script kills the process
directly instead:

```bash
pkill -f 'next-server' || true
```

Matched by `next-server` rather than the `server.js` path: Next.js sets its own process title
(`next-server (v16.2.12)`, confirmed via `ps aux` against the live process), which *replaces* what
`ps`/`pgrep -f` see as that process's command line entirely — the original `node .../server.js`
invocation is no longer visible there to match against at all.

The `|| true` matters: `pkill` exits non-zero when it finds no matching process (e.g. the very
first deploy, before the app has ever started), which would otherwise abort the rest of the script.
This assumes the deploy script runs as the same system user Passenger runs the app under — true for
Plesk's per-vhost Node.js Toolkit setup — so the kill doesn't need root.

### Auto-deploy on `git push`

Use Plesk's **Git** extension to connect this repo (as a remote you push to, or pulling from
GitHub) and set its deployment action to the same commands as step 3 above, followed by killing the
running server so Passenger respawns it:

```bash
npm ci
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp .env.local .next/standalone/.env.local
pkill -f 'next-server' || true
```

Once wired up, `git push` to the connected branch rebuilds and restarts the live site with no
manual server access needed.
