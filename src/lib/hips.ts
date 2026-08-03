import sharp from "sharp";
import { readCached, writeCached } from "./diskCache";

/**
 * Proxies the "sho"/"hso" narrowband HiPS palettes — ported from KStarsCluster's own
 * HipsProxyServlet.java (OHS_REMAP path only; that servlet also offers "-sl" starless variants
 * recombined from three separate single-channel surveys, not needed here since only sho/hso were
 * asked for — the same fetchUpstreamTile/cache plumbing extends to those if wanted later).
 *
 * simg.de's own "ohs8" HiPS (Northern Sky Narrowband Survey DR0.2) is already a fixed R=[OIII]/
 * G=Hα/B=[SII] composite with stars — sho/hso just permute its three channels per pixel rather
 * than recombining from scratch, which is enough to turn it into the classic Hubble (SHO) or HSO
 * palette without losing stars the way the pure single-channel recombination would.
 */

const BASE_URL = "https://www.simg.de/nebulae3/dr0_2/";
const HIPS_NAMESPACE = "hips";
const TILE_EXT = ".png";

// index into ohs8's own [R,G,B] = [OIII,Hα,SII] per output channel.
const OHS_REMAP: Record<string, [number, number, number]> = {
  sho: [2, 1, 0], // R=SII, G=Hα, B=OIII
  hso: [1, 2, 0], // R=Hα, G=SII, B=OIII
};

export const SUPPORTED_HIPS_PALETTES = Object.keys(OHS_REMAP);

/** e.g. "Norder3/Dir0/Npix5.png" or "Norder0/Allsky.png". */
const TILE_PATH = /^Norder\d+\/(Dir\d+\/Npix\d+|Allsky)\.png$/;

export function isValidHipsTilePath(tilePath: string): boolean {
  return TILE_PATH.test(tilePath);
}

/** ohs8's own tiles, fetched once and cached regardless of which palette (sho/hso both remap the
 *  same upstream tile) is asking. Sparse HiPS tiles 404 legitimately at deep orders — not cached,
 *  same reasoning as the original servlet (sparseness at one order says nothing about siblings). */
async function fetchOhs8Tile(tilePath: string): Promise<Buffer | null> {
  const cached = await readCached(HIPS_NAMESPACE, `ohs8/${tilePath}`, TILE_EXT);
  if (cached) return cached;

  const res = await fetch(`${BASE_URL}ohs8/${tilePath}`);
  if (!res.ok) return null;

  const buf = Buffer.from(await res.arrayBuffer());
  await writeCached(HIPS_NAMESPACE, `ohs8/${tilePath}`, TILE_EXT, buf);
  return buf;
}

export async function getHipsTile(palette: string, tilePath: string): Promise<Buffer | null> {
  const remap = OHS_REMAP[palette];
  if (!remap) return null;

  const key = `${palette}/${tilePath}`;
  const cached = await readCached(HIPS_NAMESPACE, key, TILE_EXT);
  if (cached) return cached;

  const ohs8 = await fetchOhs8Tile(tilePath);
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

/** Minimal synthetic HiPS properties file — same fixed fields KStarsCluster's own servlet
 *  generates (hips_order/tile_width/tile_format never vary for this palette engine), just with
 *  hips_service_url pointed at this deployment's own proxy route instead. */
export function getHipsProperties(palette: string, origin: string): string {
  return [
    "hips_frame=equatorial",
    "hips_order=6",
    "hips_order_min=0",
    "hips_tile_width=512",
    "hips_tile_format=png",
    `hips_service_url=${origin}/api/hips/${palette}`,
    "",
  ].join("\n");
}
