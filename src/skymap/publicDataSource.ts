import type {
  SchedulerJob,
  SkyMapDataSource,
  ObservatoryInfo, ArtificialHorizonRegion, AstrobinFootprint, AstrobinImageDetail, SurveyOption,
} from "skymap-widget";

/** Public HiPS surveys only — KStarsCluster's own liveDataSource.ts also offers NSNS custom
 *  palettes (Hα/[OIII]/[SII] combos rendered from the user's own live-captured data via its own
 *  HipsProxyServlet), which have no equivalent without that backend running. DSS2/2MASS are Aladin
 *  CDS's own public registry entries, so `builtin` needs no proxy at all. SkyMapCard.tsx defaults
 *  to whichever entry is listed first. */
const publicSurveys: SurveyOption[] = [
  { id: "dss2-color", label: "DSS2 (color)", builtin: "P/DSS2/color" },
  { id: "dss2-red", label: "DSS2 (red)", builtin: "P/DSS2/red" },
  { id: "2mass-color", label: "2MASS (color)", builtin: "P/2MASS/color" },
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
 *  through our own /api/astrobin routes, see lib/astrobin.ts); everything that depends on a live
 *  KStarsCluster backend (mount/scheduler state, artificial horizon, a Terrain panorama) has no
 *  public equivalent, so those report "not configured" and SkyMapCard already degrades gracefully
 *  for that (see isValidLocation/hasTerrain checks throughout SkyMapCard.tsx) — same as it would
 *  for anyone who's never set a location in KStars itself.
 *
 *  TODO: replace the -999/-999 sentinel below with the observatory's real latitude/longitude to
 *  enable zenith-lock and the horizon/visibility charts on the public map. */
export function createPublicSkyMapDataSource(username: string): SkyMapDataSource {
  return {
    async getObservatoryInfo(): Promise<ObservatoryInfo> {
      return { latitude: -999, longitude: -999, terrainCorrectAz: 0, terrainCorrectAlt: 0, hasTerrain: false };
    },
    async getArtificialHorizon(): Promise<ArtificialHorizonRegion[]> {
      return [];
    },
    getTerrainImageUrl(): string {
      return "";
    },
    getAstrobinFootprints: () => fetchAstrobinFootprints(username),
    getAstrobinImageDetail: (hash: string) => fetchAstrobinImageDetail(username, hash),
    async getScheduleFileJobs(): Promise<SchedulerJob[]> {
      return [];
    },
    getSurveys: () => publicSurveys,
  };
}
