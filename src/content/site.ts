/** Central place for the content that isn't fetched live from AstroBin — edit this file to make
 *  the site yours. `equipment` was pulled from the imagingTelescopes2/mounts2/filters2/etc.
 *  fields AstroBin's own API attaches to your recent uploads (excluding the OP7 image, which is
 *  someone else's collaboration project you're only a contributor on) — re-run that lookup if
 *  your setup changes rather than hand-editing stale gear here. */

export const site = {
  name: "pmneo",
  tagline: "Astrophotography from a backyard in Bavaria",
  astrobinUsername: "pmneo",
  location: {
    name: "Heimsternwarte",
    place: "Westendorf (Bayern), DE",
  },
  about: `A roll-off-roof backyard observatory in Westendorf, Bavaria — built to make imaging
    a "just walk outside" habit instead of a once-a-year road trip. The rig lives parked and
    polar-aligned under its own roof, ready to go the moment the sky clears.`,
  paypal: {
    // Set NEXT_PUBLIC_PAYPAL_BUSINESS in your environment to your PayPal business email or
    // Merchant ID to enable the donate button (see .env.example).
    business: process.env.NEXT_PUBLIC_PAYPAL_BUSINESS ?? "",
    itemName: "Buy me a beer 🍺",
  },
  equipment: [
    {
      category: "Mount",
      items: [{ name: "Sky-Watcher EQ8", note: "Equatorial, 50 kg payload" }],
    },
    {
      category: "Imaging optics",
      items: [{ name: "Sky-Watcher Esprit 100ED", note: "100mm apo triplet refractor, 550mm FL" }],
    },
    {
      category: "Imaging camera",
      items: [{ name: "ZWO ASI2600MM Pro", note: "Cooled mono, dedicated deep-sky" }],
    },
    {
      category: "Filters",
      items: [
        { name: "Astronomik LRGB", note: "Deep-Sky L/R/G/B, 36mm" },
        { name: "Astronomik Ha/OIII/SII 6nm", note: "Narrowband CCD set, 36mm" },
        { name: "Antlia 3nm OIII", note: "Narrowband, 36mm" },
      ],
    },
    {
      category: "Guiding",
      items: [
        { name: "SVBony SV106", note: "50mm guide scope" },
        { name: "ZWO ASI120MM Mini", note: "Guide camera" },
      ],
    },
    {
      category: "Accessories",
      items: [
        { name: "APM-Riccardi 0.75x reducer/corrector", note: "M63" },
        { name: "ZWO EFW 7×36mm", note: "Motorized filter wheel" },
        { name: "DeepSkyDad AF3", note: "Autofocuser" },
        { name: "Pegasus Astro Falcon Rotator", note: "Field derotator" },
      ],
    },
    {
      category: "Software",
      items: [
        { name: "PixInsight" },
        { name: "Astro Pixel Processor" },
        { name: "Adobe Photoshop" },
        { name: "SetiAstro Suite Pro" },
        { name: "KStarsCluster", note: "Own capture/scheduling app" },
      ],
    },
  ],
};

export type Site = typeof site;
