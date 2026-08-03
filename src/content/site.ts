/** Central place for the content that isn't fetched live from AstroBin — edit this file to make
 *  the site yours. Everything under `equipment` is a placeholder; replace with your real gear. */

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
      items: [{ name: "TODO: your mount", note: "e.g. Skywatcher EQ6-R Pro" }],
    },
    {
      category: "Optics",
      items: [{ name: "TODO: your telescope(s)", note: "e.g. 2x refractor cluster" }],
    },
    {
      category: "Imaging camera",
      items: [{ name: "TODO: your camera", note: "e.g. ASI2600MM Pro + filter wheel" }],
    },
    {
      category: "Observatory",
      items: [{ name: "TODO: your setup", note: "e.g. roll-off-roof shed, remote controlled" }],
    },
  ],
};

export type Site = typeof site;
