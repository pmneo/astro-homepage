import type {
  SchedulerJob,
  SkyMapDataSource,
  ObservatoryInfo, ArtificialHorizonRegion, AstrobinFootprint, AstrobinImageDetail, SurveyOption,
} from "skymap-widget";
import { OBSERVATORY_LOCATION, ARTIFICIAL_HORIZON, TERRAIN_IMAGE_URL } from "./observatoryConfig";
import { site } from "@/content/site";

/** Every survey routed through this site's own /api/hips proxy (see src/lib/hips.ts) rather than
 *  letting Aladin fetch any of them directly — DSS2/2MASS used to be Aladin's own `builtin` CDS
 *  registry entries, but Aladin's default pick for P/DSS2/color (irsa.ipac.caltech.edu) sends no
 *  CORS header, so the *browser* fetch fails once (visible as a console error) before Aladin falls
 *  back to a mirror. Proxying server-side sidesteps that entirely — CORS doesn't apply there.
 *  SkyMapCard.tsx defaults to whichever entry is listed first. */
const publicSurveys: SurveyOption[] = [
  { id: "sho", label: "SHO (Hubble palette)", custom: { url: "/api/hips/sho", frame: "equatorial", order: 6 } },
  { id: "hso", label: "HSO (Hα/[SII]/[OIII])", custom: { url: "/api/hips/hso", frame: "equatorial", order: 6 } },
  { id: "dss2-color", label: "DSS2 (color)", custom: { url: "/api/hips/dss2-color", frame: "equatorial", order: 9 } },
  { id: "dss2-red", label: "DSS2 (red)", custom: { url: "/api/hips/dss2-red", frame: "equatorial", order: 9 } },
  { id: "2mass-color", label: "2MASS (color)", custom: { url: "/api/hips/2mass-color", frame: "equatorial", order: 9 } },
];

async function fetchAstrobinFootprints(username: string): Promise<AstrobinFootprint[]> {
  const res = await fetch(`/api/astrobin/${encodeURIComponent(username)}/footprints`);
  if (!res.ok) throw new Error(`astrobin footprints request failed: ${res.status}`);
  const data = (await res.json()) as { footprints: AstrobinFootprint[] };
  return data.footprints;
}

async function fetchAstrobinImageDetail(username: string, hash: string): Promise<AstrobinImageDetail> {
  const res = await fetch(`/api/astrobin/${encodeURIComponent(username)}/image/${encodeURIComponent(hash)}`);
  if (!res.ok) throw new Error(`astrobin image detail request failed: ${res.status}`);
  return res.json();
}

/** SkyMapCard's data source for the public site — the AstroBin-backed methods are real (proxied
 *  through our own /api/astrobin routes, see lib/astrobin.ts). Location/horizon/terrain are the
 *  real Heimsternwarte config (see observatoryConfig.ts) rather than a live fetch — this site has
 *  no access to KStarsCluster's own backend/database, so they're a point-in-time copy instead.
 *
 *  That physical-location data is tied to the site owner specifically — showing it for someone
 *  else's looked-up gallery (Explore section) would be actively wrong (their horizon obstructions,
 *  terrain photo, and lat/lon have nothing to do with wherever *they* actually image from), so it
 *  only applies when the requested username is the site's own. */
export function createPublicSkyMapDataSource(username: string): SkyMapDataSource {
  const isOwnObservatory = username.trim().toLowerCase() === site.astrobinUsername.toLowerCase();

  return {
    async getObservatoryInfo(): Promise<ObservatoryInfo> {
      if (!isOwnObservatory) return { latitude: -999, longitude: -999, terrainCorrectAz: 0, terrainCorrectAlt: 0, hasTerrain: false };
      return { ...OBSERVATORY_LOCATION, hasTerrain: true };
    },
    async getArtificialHorizon(): Promise<ArtificialHorizonRegion[]> {
      return isOwnObservatory ? ARTIFICIAL_HORIZON : [];
    },
    getTerrainImageUrl(): string {
      return isOwnObservatory ? TERRAIN_IMAGE_URL : "";
    },
    getAstrobinFootprints: () => fetchAstrobinFootprints(username),
    getAstrobinImageDetail: (hash: string) => fetchAstrobinImageDetail(username, hash),
    async getScheduleFileJobs(): Promise<SchedulerJob[]> {
      return [];
    },
    getSurveys: () => publicSurveys,
  };
}
