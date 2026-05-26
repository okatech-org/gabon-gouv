import { defineConfig, devices } from "@playwright/test"

/**
 * Configuration Playwright pour les smoke tests E2E (Phase Trous F).
 *
 * Couvre les 3 apps Next.js du monorepo. Chaque projet cible un port
 * différent (citizen=3000, admin=3001, platform=3002) — démarrer
 * les serveurs au préalable avec `bun run dev:citizen` etc.
 *
 * Pour exécuter :
 *   bun playwright install chromium  # 1ère fois seulement
 *   bun run test:e2e                  # tous les smoke tests
 *   bun run test:e2e -- --project=admin
 *
 * Les tests sont volontairement minimaux v1 : vérifient que les pages
 * de login + home se chargent sans 500, que le HTML attendu est présent.
 * Ils ne dépendent PAS d'un backend Convex actif (les pages publiques
 * font des fallbacks gracieux si l'API n'est pas joignable).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isCI = !!(globalThis as any).process?.env?.CI

export default defineConfig({
  testDir: "./tests-e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? "line" : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "citizen",
      testMatch: /citizen-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" },
    },
    {
      name: "admin",
      testMatch: /admin-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" },
    },
    {
      name: "platform",
      testMatch: /platform-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3002" },
    },
  ],
})
