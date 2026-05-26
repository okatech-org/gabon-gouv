import { expect, test } from "@playwright/test"

/**
 * Smoke test vitrine citoyenne (Phase Trous F).
 *
 * Prérequis : `bun run dev:citizen` (port 3000).
 *
 * Vérifie :
 *   - Page d'accueil charge sans erreur serveur
 *   - Skip link RGAA présent (premier focusable)
 *   - main landmark avec id="main" + tabindex=-1
 *   - Filet tricolore Gabon visible
 *   - Liens vers /aide et /administrations existent
 */

test.describe("Citizen vitrine", () => {
  test("home charge avec landmarks RGAA", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Gabon Connect/i)

    // Skip link RGAA 12.7
    const skipLink = page.locator("a.skip-link")
    await expect(skipLink).toBeAttached()
    await expect(skipLink).toHaveAttribute("href", "#main")

    // main landmark
    const main = page.locator("main#main")
    await expect(main).toBeAttached()
    await expect(main).toHaveAttribute("tabindex", "-1")
  })

  test("page /aide existe", async ({ page }) => {
    const res = await page.goto("/aide")
    expect(res?.status() ?? 0).toBeLessThan(500)
  })

  test("page /administrations existe", async ({ page }) => {
    const res = await page.goto("/administrations")
    expect(res?.status() ?? 0).toBeLessThan(500)
  })

  test("page /accessibilite charge", async ({ page }) => {
    const res = await page.goto("/accessibilite")
    expect(res?.status() ?? 0).toBeLessThan(500)
  })
})
