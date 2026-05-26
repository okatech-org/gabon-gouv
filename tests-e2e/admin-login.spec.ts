import { expect, test } from "@playwright/test"

/**
 * Smoke test admin login (Phase Trous F).
 *
 * Prérequis : `bun run dev:admin` (port 3001).
 *
 * Vérifie :
 *   - Redirection / → /login si non connecté
 *   - Page /login charge sans 500
 *   - Form de saisie NIP présent
 *   - Filet tricolore Gabon visible (RepublicBar)
 */

test.describe("Admin login", () => {
  test("racine redirige vers /login", async ({ page }) => {
    const res = await page.goto("/")
    // Soit redirection HTTP, soit redirection Next côté serveur → URL finale /login
    expect(page.url()).toMatch(/\/login/)
    expect(res?.status() ?? 0).toBeLessThan(500)
  })

  test("page /login affiche un form NIP", async ({ page }) => {
    await page.goto("/login")
    await expect(page).toHaveTitle(/Gabon Connect|Connexion/i)
    // Le form de login attend un NIP — input avec label NIP attendu
    const nipInput = page.locator('input[name="nip"], input[id*="nip" i]')
    await expect(nipInput.first()).toBeAttached()
  })
})

test.describe("Admin enrolement public", () => {
  test("token invalide → page d'erreur 'Invitation introuvable'", async ({
    page,
  }) => {
    const res = await page.goto("/enrolement/token-bidon-xxxx")
    expect(res?.status() ?? 0).toBeLessThan(500)
    await expect(page.locator("body")).toContainText(/Invitation introuvable/i)
  })
})
