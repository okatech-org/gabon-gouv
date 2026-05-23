import { defineConfig } from "vitest/config"

/**
 * Backend Convex tests : edge-runtime simule l'environnement Convex.
 * Le glob de modules est nécessaire pour que convex-test charge les fonctions.
 */
export default defineConfig({
  test: {
    name: "backend",
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
})
