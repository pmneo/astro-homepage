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
 * - OHS_REMAP: sho/hso, permuted from simg.de's own starfull "ohs8" composite (ported from
 *   KStarsCluster's HipsProxyServlet.java).
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

// === sho/hso: channel-permuted from simg.de's ohs8 ===

const SIMG_BASE_URL = "https://www.simg.de/nebulae3/dr0_2/";

// index into ohs8's own [R,G,B] = [OIII,Hα,SII] per output channel.
const OHS_REMAP: Record<string, [number, number, number]> = {
  sho: [2, 1, 0], // R=SII, G=Hα, B=OIII
  hso: [1, 2, 0], // R=Hα, G=SII, B=OIII
};

function fetchOhs8Raw(path: string, ext: string): Promise<Buffer | null> {
  return fetchAndCache(`${SIMG_BASE_URL}ohs8/${path}`, HIPS_NAMESPACE, `ohs8/${path}`, ext);
}

async function getOhsRemapTile(palette: string, tilePath: string): Promise<Buffer | null> {
  const remap = OHS_REMAP[palette];
  const key = `${palette}/${tilePath}`;
  const cached = await readCached(HIPS_NAMESPACE, key, TILE_EXT);
  if (cached) return cached;

  // Sparse HiPS tiles 404 legitimately at deep orders — not cached, same reasoning as the
  // original servlet (sparseness at one order says nothing about siblings).
  const ohs8 = await fetchOhs8Raw(tilePath, TILE_EXT);
  if (!ohs8) return null;

  const { data, info } = await sharp(ohs8).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const remapped = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    remapped[i] = data[i + remap[0]];
    remapped[i + 1] = data[i + remap[1]];
    remapped[i + 2] = data[i + remap[2]];
  }
  const png = await sharp(remapped, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png()
    .toBuffer();

  await writeCached(HIPS_NAMESPACE, key, TILE_EXT, png);
  return png;
}

// Channel-order description per palette, for the human-readable obs_description field below —
// matches OHS_REMAP above (ohs8's own [OIII,Hα,SII] permuted into each palette's R/G/B).
const CHANNEL_LABELS = ["[OIII]", "Hα", "[SII]"];
function channelDescription(palette: string): string {
  const remap = OHS_REMAP[palette];
  return `R=${CHANNEL_LABELS[remap[0]]}/G=${CHANNEL_LABELS[remap[1]]}/B=${CHANNEL_LABELS[remap[2]]}`;
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

export const SUPPORTED_HIPS_PALETTES = [...Object.keys(OHS_REMAP), ...Object.keys(RAW_SURVEYS)];

export async function getHipsTile(palette: string, tilePath: string): Promise<Buffer | null> {
  if (OHS_REMAP[palette]) return getOhsRemapTile(palette, tilePath);
  if (RAW_SURVEYS[palette]) return getRawSurveyTile(palette, tilePath);
  return null;
}

/** The MOC tells Aladin which parts of the sky a survey actually has data for — without it,
 *  Aladin has no way to know that short of probing tiles. NSNS (sho/hso) only covers part of the
 *  northern sky, so this matters there especially; DSS2/2MASS are effectively all-sky but Aladin
 *  still fetches this for every custom survey regardless. */
export async function getHipsMoc(palette: string): Promise<Buffer | null> {
  if (OHS_REMAP[palette]) return fetchOhs8Raw("Moc.fits", ".fits");
  const config = RAW_SURVEYS[palette];
  if (config) return fetchAndCache(`${config.upstreamBase}/Moc.fits`, HIPS_NAMESPACE, `${palette}/Moc.fits`, ".fits");
  return null;
}

/** Synthetic HiPS properties file for every proxied survey — full field set for the OHS_REMAP
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

  if (OHS_REMAP[palette]) {
    const paletteUpper = palette.toUpperCase();
    return [
      `obs_collection=Northern Sky Narrowband Survey (${paletteUpper} composite)`,
      `obs_title=NSNS DR0.2: ${paletteUpper} composite (proxied)`,
      `obs_description=Server-side ${channelDescription(palette)} composite, permuted from simg.de's own starfull ohs8 survey on the fly.`,
      "hips_frame=equatorial",
      "hips_order=6",
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
