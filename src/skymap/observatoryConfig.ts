import type { ArtificialHorizonRegion } from "skymap-widget";

/** Heimsternwarte, Westendorf (Bayern) — pulled once from the live KStarsCluster instance's own
 *  ~/.config/kstarsrc ([Location]) and userdb.sqlite (horizons table, "Bereich 3" — the only
 *  enabled region). Static here rather than fetched, since this public site has no access to that
 *  backend/database at all; re-run that lookup and update this file if the observatory or its
 *  obstructions change. */
export const OBSERVATORY_LOCATION = {
  latitude: 48.13305555555556,
  longitude: 11.583055555555555,
  terrainCorrectAz: -8,
  terrainCorrectAlt: 3,
};

export const ARTIFICIAL_HORIZON: ArtificialHorizonRegion[] = [
  {
    label: "Bereich 3",
    points: [
      { az: 8.0625, alt: 15.49 }, { az: 24.653, alt: 24.752 }, { az: 42.927, alt: 26.272 },
      { az: 83.518, alt: 24.643 }, { az: 89.159, alt: 23.289 }, { az: 91.746, alt: 22.792 },
      { az: 92.685, alt: 26.686 }, { az: 93.394, alt: 28.569 }, { az: 99.772, alt: 27.961 },
      { az: 100.753, alt: 21.088 }, { az: 108.243, alt: 16.746 }, { az: 117.373, alt: 16.044 },
      { az: 120.859, alt: 14.282 }, { az: 128.505, alt: 4.946 }, { az: 134.183, alt: 3.748 },
      { az: 141.148, alt: 8.575 }, { az: 145.537, alt: 10.092 }, { az: 148.855, alt: 11.847 },
      { az: 153.520, alt: 15.901 }, { az: 159.184, alt: 17.731 }, { az: 167.987, alt: 15.731 },
      { az: 173.186, alt: 12.649 }, { az: 175.800, alt: 10.873 }, { az: 182.489, alt: 16.270 },
      { az: 187.104, alt: 22.399 }, { az: 191.529, alt: 24.415 }, { az: 197.550, alt: 23.514 },
      { az: 202.603, alt: 25.741 }, { az: 212.689, alt: 30.488 }, { az: 221.368, alt: 33.027 },
      { az: 235.866, alt: 38.893 }, { az: 249.449, alt: 43.151 }, { az: 264.704, alt: 43.551 },
      { az: 282.415, alt: 41.053 }, { az: 292.893, alt: 36.669 }, { az: 296.397, alt: 29.718 },
      { az: 297.904, alt: 21.619 }, { az: 304.881, alt: 20.754 }, { az: 311.330, alt: 20.369 },
      { az: 316.736, alt: 22.172 }, { az: 323.708, alt: 23.747 }, { az: 333.409, alt: 24.451 },
      { az: 344.983, alt: 22.812 }, { az: 356.068, alt: 18.927 }, { az: 367.808, alt: 15.961 },
      { az: 8.0625, alt: 15.49 },
    ],
  },
];

/** The observatory's own roll-off-roof panorama (KStars: View > Show Terrain), copied once from
 *  the live instance's Terrain.TerrainSource file — served as a plain static asset here rather
 *  than proxied, since (unlike AstroBin) there's no live source it could go stale against. */
export const TERRAIN_IMAGE_URL = "/rolloff.png";
