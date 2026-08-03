// Fetches third-party browser bundles too large/volatile to commit into the repo — runs before
// dev/build (see package.json) and is a no-op once the file already exists locally. Ported from
// KStarsCluster's own websrc/KStarsCluster/scripts/fetch-vendor.mjs: loading Aladin Lite straight
// from aladin.cds.unistra.fr on every visit was slow (external DNS + TLS + their own server, not a
// CDN edge near most visitors) — self-hosting it fixes that the same way it already does there.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname } from 'node:path';

const FILES = [
  {
    url: 'https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js',
    dest: new URL('../public/vendor/aladin/aladin.js', import.meta.url),
  },
];

for (const { url, dest } of FILES) {
  const path = dest.pathname;
  try {
    await access(path);
    console.log(`[fetch-vendor] ${path} already present, skipping`);
    continue;
  } catch {
    // not present — fetch it below
  }

  console.log(`[fetch-vendor] fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[fetch-vendor] failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const body = Buffer.from(await res.arrayBuffer());

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
  console.log(`[fetch-vendor] wrote ${path} (${body.length} bytes)`);
}
