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
2. **Build on deploy**: set the toolkit's custom "run script" (or the Git deployment hook below) to:
   ```bash
   npm ci
   npm run build
   cp -r public .next/standalone/public
   cp -r .next/static .next/standalone/.next/static
   ```
   (`standalone` doesn't copy `public/` or the static asset folder itself — Next expects you to
   place them next to the generated `server.js`.)
3. **Environment variables** — two different things, easy to mix up:
   - `CACHE_EVICT_SECRET` is read at *request time* (`process.env...` inside an API route), so it
     just needs to be set wherever Passenger actually runs the app — the Node.js Toolkit's
     environment variables panel, not `.env.local` (Passenger doesn't read dotfiles by default).
   - `NEXT_PUBLIC_PAYPAL_BUSINESS` is **inlined into the client JS bundle at `next build` time** —
     Next.js replaces `process.env.NEXT_PUBLIC_PAYPAL_BUSINESS` with a literal string during the
     build step, once, permanently. If Plesk's Node.js Toolkit only injects its panel-configured
     env vars into the *running server process* and not into the separate build/deploy step (this
     varies by Plesk setup), the variable will read as empty in the built bundle no matter how
     many times you restart the app afterward — only a *rebuild* with the variable actually present
     during `npm run build` fixes it.
   - **Bulletproof workaround** if you're not sure which case you're in: set it directly on the
     build command itself in your deploy script/hook (step 2 above and the auto-deploy script
     below), e.g. `NEXT_PUBLIC_PAYPAL_BUSINESS=you@example.com npm run build` — this can't fail to
     reach the build step, regardless of how Plesk's panel variables are wired.
   - To check which case you're actually in: after a deploy, view the page source and search for
     `PAYPAL_BUSINESS` — if it's an empty string literal in the JS, the build step didn't see it.
   - `GIT_REPO` (optional) points `next.config.ts` at Plesk's own bare repo clone for the
     `NEXT_PUBLIC_GIT_SHA` footer build (see below) — set it in the same panel, same build-time
     caveat as `NEXT_PUBLIC_PAYPAL_BUSINESS` applies.
4. **Restart**: Plesk's Node.js Toolkit restarts the app automatically when you save its settings,
   or via "Restart App" in its UI.

### Showing the deployed commit in the footer

`next.config.ts` inlines the running build's short git SHA into `NEXT_PUBLIC_GIT_SHA` (see
`Footer.tsx`) by running `git rev-parse --short HEAD` at build time. That works fine for local
dev/builds, but fails in Plesk: the Git extension deploys this app's files into the *application
root* by copying them without a `.git` directory, so there's nothing there for `git rev-parse` to
find, and it silently falls back to `"unknown"`.

Passing the SHA through the deploy script itself turned out to be unreliable in practice (Plesk's
deploy action doesn't hand values from one script line to the next, whether via an inline env var
prefix or a file one line writes and a later line reads). The fix instead is `GIT_REPO`: set it
once in the Node.js Toolkit's environment-variables panel to the path of the Git extension's own
bare repo clone, e.g.:

```
GIT_REPO=/var/www/vhosts/pmneo.de/git/astro-homepage.git
```

`next.config.ts` then runs `git -C "$GIT_REPO" rev-parse --short HEAD` instead of a plain
`git rev-parse` — works on a bare repo too, no working tree needed — reading the SHA straight from
the repo Plesk itself deployed from, rather than e.g. asking GitHub's API for "the latest commit
on main" (which would only be a guess at what's live, wrong the moment a deploy lags behind a push
or a non-`main` ref is what's actually checked out).

### Auto-deploy on `git push`

Use Plesk's **Git** extension to connect this repo (as a remote you push to, or pulling from
GitHub) and set its deployment action to the same three commands as step 2 above, followed by
touching Passenger's restart file:

```bash
npm ci
NEXT_PUBLIC_PAYPAL_BUSINESS=you@example.com npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
mkdir -p .next/standalone/tmp && touch .next/standalone/tmp/restart.txt
```

(the `NEXT_PUBLIC_...=` prefix directly on the build command is the bulletproof workaround from
step 3 above — reaches the build regardless of how Plesk's own panel env vars are wired; swap in
your real value.)

Once wired up, `git push` to the connected branch rebuilds and restarts the live site with no
manual server access needed.
