import sharp from "sharp";
import { readCached, writeCached } from "./diskCache";

/**
 * Proxies every HiPS sky survey this site offers — narrowband palettes recombined server-side,
 * plus the plain public surveys (DSS2, 2MASS) that used to be loaded straight from Aladin's own
 * CDS registry. Routing those through here too, instead of letting Aladin fetch them directly,
 * sidesteps a real problem: Aladin's default pick for P/DSS2/color (irsa.ipac.caltech.edu) sends
 * no CORS header, so the *browser* can't fetch it directly — Aladin silently falls back to a
 * mirror after a failed attempt, but that failed attempt still shows up as a console error on
 * every load. None of that applies to a server-side fetch (CORS is a browser-only concept), so
 * proxying+caching it here is both quieter and one request faster.
 *
 * Two kinds of upstream, two code paths:
 * - SIMG_SURVEYS: sho/hso/rgb, channel-permuted (or, for rgb, passed through as-is) from simg.de's
 *   own "ohs8"/"rgb8" composites (sho/hso ported from KStarsCluster's HipsProxyServlet.java).
 * - RAW_SURVEYS: DSS2/2MASS, straight passthrough+cache from their real host, transcoded from
 *   their native JPEG to PNG since SkyMapCard's buildImageSurvey() hardcodes `imgFormat: 'png'`
 *   for every custom survey regardless of what the upstream actually serves.
 */

const HIPS_NAMESPACE = "hips";
const TILE_EXT = ".png";
/** e.g. "Norder3/Dir0/Npix5.png" or "Norder0/Allsky.png" — what Aladin requests from *us*, always
 *  .png (see buildImageSurvey's imgFormat above), regardless of the upstream's real format. */
const TILE_PATH = /^Norder\d+\/(Dir\d+\/Npix\d+|Allsky)\.png$/;

export function isValidHipsTilePath(tilePath: string): boolean {
  return TILE_PATH.test(tilePath);
}

async function fetchAndCache(url: string, namespace: string, key: string, ext: string): Promise<Buffer | null> {
  const cached = await readCached(namespace, key, ext);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) return null;

  const buf = Buffer.from(await res.arrayBuffer());
  await writeCached(namespace, key, ext, buf);
  return buf;
}

async function toPng(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes).png().toBuffer();
}

// === sho/hso/rgb: from simg.de's ohs8 (channel-permuted) and rgb8 (passed through as-is) ===

const SIMG_BASE_URL = "https://www.simg.de/nebulae3/dr0_2/";

interface SimgSurveyConfig {
  /** Upstream folder under SIMG_BASE_URL — sho/hso share "ohs8" (permuted differently from the
   *  same source), rgb has its own "rgb8" folder (a real RGB continuum composite, not a
   *  narrowband recombination — see obsDescription). */
  source: string;
  /** Index into the source's own [R,G,B] per output channel — [0,1,2] (identity) for rgb, since
   *  there's nothing to permute there. */
  remap: [number, number, number];
  /** The source's own real hips_order (see its properties file) — ohs8 and rgb8 don't share one
   *  (6 vs. 5), so this has to be per-survey, not a single hardcoded constant, or Aladin would
   *  request tiles one order past what rgb8 actually has. */
  order: number;
  obsTitle: string;
  obsDescription: string;
}

const SIMG_SURVEYS: Record<string, SimgSurveyConfig> = {
  sho: {
    source: "ohs8", remap: [2, 1, 0], order: 6,
    obsTitle: "NSNS DR0.2: SHO composite (proxied)",
    obsDescription: "Server-side R=[SII]/G=Hα/B=[OIII] composite, permuted from simg.de's own starfull ohs8 survey on the fly.",
  },
  hso: {
    source: "ohs8", remap: [1, 2, 0], order: 6,
    obsTitle: "NSNS DR0.2: HSO composite (proxied)",
    obsDescription: "Server-side R=Hα/G=[SII]/B=[OIII] composite, permuted from simg.de's own starfull ohs8 survey on the fly.",
  },
  rgb: {
    source: "rgb8", remap: [0, 1, 2], order: 5,
    obsTitle: "NSNS DR0.2: RGB continuum (proxied)",
    obsDescription: "Server-side pass-through of simg.de's own rgb8 survey (red/green/blue continuum, with partially subtracted stars) — no channel permutation, just the same no-coverage-pixel fix as sho/hso.",
  },
};

// Aladin Lite's own default "no HiPS data here" background (its init option defaults to exactly
// this, see aladin.js's own `backgroundColor:"rgb(60, 60, 60)"`) — but that default only paints
// the letterboxed area *outside* the projected sky circle. *Within* a tile, Aladin's WebGL
// renderer turns out not to alpha-blend the base image layer at all — confirmed by reading back
// the actual canvas pixel at a known no-coverage point: alpha=0 rendered as fully opaque black,
// identical to how alpha=255 black would render. ohs8/rgb8's own no-coverage pixels are alpha=0
// with RGB baked in as (0,0,0) — real black, not a neutral placeholder — so preserving alpha
// (below) is necessary but not sufficient; the RGB itself has to be replaced too, to match this
// deployment too, not just whatever viewer originally rendered simg.de's tiles as gray.
const NODATA_RGB: [number, number, number] = [60, 60, 60];

function fetchSimgSourceRaw(source: string, path: string, ext: string): Promise<Buffer | null> {
  return fetchAndCache(`${SIMG_BASE_URL}${source}/${path}`, HIPS_NAMESPACE, `${source}/${path}`, ext);
}

async function getSimgTile(palette: string, tilePath: string): Promise<Buffer | null> {
  const config = SIMG_SURVEYS[palette];
  const key = `${palette}/${tilePath}`;
  const cached = await readCached(HIPS_NAMESPACE, key, TILE_EXT);
  if (cached) return cached;

  // Sparse HiPS tiles 404 legitimately at deep orders — not cached, same reasoning as the
  // original servlet (sparseness at one order says nothing about siblings).
  const source = await fetchSimgSourceRaw(config.source, tilePath, TILE_EXT);
  if (!source) return null;

  // The source's own tiles are RGBA, alpha=0 marking pixels the survey has no coverage for at all
  // (NSNS doesn't cover the whole sky) — but the output here is always fully opaque, alpha=0
  // replaced by opaque gray rather than kept transparent: every alpha-aware compositor in this
  // pipeline (canvas 2D, and — confirmed by reading back an actual rendered WebGL pixel — Aladin's
  // own tile texture upload) stores colors premultiplied by alpha, which collapses RGB to (0,0,0)
  // at alpha=0 regardless of what color was there, the moment anything draws/uploads/reads back
  // the image. An earlier version of this fix kept the real alpha=0 and just swapped in a gray
  // RGB, which looked identical to plain black once premultiplied — same bug, just moved from
  // "wrong RGB" to "right RGB, alpha erases it". Since the result is always opaque, output is
  // plain RGB (3 channels) rather than carrying an alpha channel that would only ever say 255.
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const srcChannels = info.channels;
  const remapped = Buffer.alloc(info.width * info.height * 3);
  for (let px = 0, si = 0, di = 0; px < info.width * info.height; px++, si += srcChannels, di += 3) {
    const alpha = srcChannels === 4 ? data[si + 3] : 255;
    if (alpha === 0) {
      remapped[di] = NODATA_RGB[0];
      remapped[di + 1] = NODATA_RGB[1];
      remapped[di + 2] = NODATA_RGB[2];
    } else {
      remapped[di] = data[si + config.remap[0]];
      remapped[di + 1] = data[si + config.remap[1]];
      remapped[di + 2] = data[si + config.remap[2]];
    }
  }
  const png = await sharp(remapped, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png()
    .toBuffer();

  await writeCached(HIPS_NAMESPACE, key, TILE_EXT, png);
  return png;
}

// === DSS2/2MASS: straight passthrough (format-converted), from their real public host ===

interface RawSurveyConfig {
  upstreamBase: string;
  /** The upstream's own native tile extension — never what Aladin actually requests from us
   *  (always .png, see TILE_PATH above), only what we ask the upstream itself for. */
  upstreamTileExt: string;
  order: number;
  obsTitle: string;
  obsCopyright: string;
}

const RAW_SURVEYS: Record<string, RawSurveyConfig> = {
  "dss2-color": {
    upstreamBase: "https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/color",
    upstreamTileExt: ".jpg",
    order: 9,
    obsTitle: "DSS colored",
    obsCopyright: "Digitized Sky Survey - STScI/NASA, Colored & Healpixed by CDS",
  },
  "dss2-red": {
    upstreamBase: "https://irsa.ipac.caltech.edu/data/hips/CDS/DSS2/red",
    upstreamTileExt: ".jpg",
    order: 9,
    obsTitle: "DSS2 Red",
    obsCopyright: "Digitized Sky Survey - STScI/NASA, Healpixed by CDS",
  },
  "2mass-color": {
    upstreamBase: "https://irsa.ipac.caltech.edu/data/hips/CDS/2MASS/Color",
    upstreamTileExt: ".jpg",
    order: 9,
    obsTitle: "2MASS Color",
    obsCopyright: "2MASS/IPAC, Colored & Healpixed by CDS",
  },
};

async function getRawSurveyTile(palette: string, tilePath: string): Promise<Buffer | null> {
  const config = RAW_SURVEYS[palette];
  const key = `${palette}/${tilePath}`;
  const cached = await readCached(HIPS_NAMESPACE, key, TILE_EXT);
  if (cached) return cached;

  const upstreamPath = tilePath.replace(/\.png$/, config.upstreamTileExt);
  const res = await fetch(`${config.upstreamBase}/${upstreamPath}`);
  if (!res.ok) return null;

  const png = await toPng(Buffer.from(await res.arrayBuffer()));
  await writeCached(HIPS_NAMESPACE, key, TILE_EXT, png);
  return png;
}

// === dispatch ===

export const SUPPORTED_HIPS_PALETTES = [...Object.keys(SIMG_SURVEYS), ...Object.keys(RAW_SURVEYS)];

export async function getHipsTile(palette: string, tilePath: string): Promise<Buffer | null> {
  if (SIMG_SURVEYS[palette]) return getSimgTile(palette, tilePath);
  if (RAW_SURVEYS[palette]) return getRawSurveyTile(palette, tilePath);
  return null;
}

/** The MOC tells Aladin which parts of the sky a survey actually has data for — without it,
 *  Aladin has no way to know that short of probing tiles. NSNS (sho/hso/rgb) only covers part of
 *  the northern sky, so this matters there especially; DSS2/2MASS are effectively all-sky but
 *  Aladin still fetches this for every custom survey regardless. */
export async function getHipsMoc(palette: string): Promise<Buffer | null> {
  const simgConfig = SIMG_SURVEYS[palette];
  if (simgConfig) return fetchSimgSourceRaw(simgConfig.source, "Moc.fits", ".fits");
  const config = RAW_SURVEYS[palette];
  if (config) return fetchAndCache(`${config.upstreamBase}/Moc.fits`, HIPS_NAMESPACE, `${palette}/Moc.fits`, ".fits");
  return null;
}

/** Synthetic HiPS properties file for every proxied survey — full field set for the SIMG_SURVEYS
 *  palettes ported from KStarsCluster's own HipsProxyServlet.servePropertiesFile (an earlier,
 *  incomplete port here was missing dataproduct_type, which Aladin Lite logs as required and —
 *  worse — silently left the survey object in a state that could trip a "recursive use of an
 *  object" wasm-bindgen panic on redraw). Synthesized rather than the upstream's own properties
 *  file (for RAW_SURVEYS) since hips_tile_format has to say png here regardless of what the real
 *  survey natively uses — safer than trying to rewrite just that one line out of someone else's
 *  file and risk missing another field Aladin cares about. */
export function getHipsProperties(palette: string, origin: string): string | null {
  const serviceUrl = `hips_service_url=${origin}/api/hips/${palette}`;
  const creatorDid = `creator_did=ivo://astro-homepage/hips/${palette}`;

  const simgConfig = SIMG_SURVEYS[palette];
  if (simgConfig) {
    const paletteUpper = palette.toUpperCase();
    return [
      `obs_collection=Northern Sky Narrowband Survey (${paletteUpper} composite)`,
      `obs_title=${simgConfig.obsTitle}`,
      `obs_description=${simgConfig.obsDescription}`,
      "hips_frame=equatorial",
      `hips_order=${simgConfig.order}`,
      "hips_order_min=0",
      "hips_tile_width=512",
      "hips_tile_format=png",
      "hips_status=public master clonable",
      "hips_version=1.4",
      "dataproduct_type=image",
      "client_application=AladinLite",
      serviceUrl,
      creatorDid,
      "",
    ].join("\n");
  }

  const config = RAW_SURVEYS[palette];
  if (config) {
    return [
      `obs_collection=${config.obsTitle}`,
      `obs_title=${config.obsTitle}`,
      `obs_copyright=${config.obsCopyright}`,
      "hips_frame=equatorial",
      `hips_order=${config.order}`,
      "hips_order_min=0",
      "hips_tile_width=512",
      "hips_tile_format=png",
      "hips_status=public master clonable",
      "hips_version=1.4",
      "dataproduct_type=image",
      "client_application=AladinLite",
      serviceUrl,
      creatorDid,
      "",
    ].join("\n");
  }

  return null;
}
