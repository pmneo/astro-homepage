import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // src/skymap (plus its small src/api support files) is vendored in unmodified from
    // KStarsCluster's own live dashboard app, which has its own established lint posture for this
    // code — Aladin Lite has no official types (hence the `any`s), and its refs/effects patterns
    // are deliberate (see e.g. SkyMapCard.tsx's own comments on lastTerrainViewKeyRef). Don't
    // rewrite proven astronomy/canvas code to satisfy a different project's stricter rules.
    files: ["src/skymap/**", "src/api/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
