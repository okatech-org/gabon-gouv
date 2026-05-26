import { expect, test } from "@playwright/test"

/**
 * Smoke test platform login (Phase Trous F).
 *
 * Prérequis : `bun run dev:platform` (port 3002).
 *
 * Vérifie :
 *   - Racine redirige vers /login
 *   - Page /login affiche le form
 */

test.describe("Platform login", () => {
  test("racine redirige vers /login", async ({ page }) => {
    const res = await page.goto("/")
    expect(page.url()).toMatch(/\/login/)
    expect(res?.status() ?? 0).toBeLessThan(500)
  })

  test("page /login charge", async ({ page }) => {
    const res = await page.goto("/login")
    expect(res?.status() ?? 0).toBeLessThan(500)
    await expect(page).toHaveTitle(/Gabon Connect|Console|Connexion/i)
  })
})
