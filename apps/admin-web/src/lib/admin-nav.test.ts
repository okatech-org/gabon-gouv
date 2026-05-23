/**
 * Tests purs sur le builder de nav admin — pas besoin de mount React.
 */
import { describe, expect, test } from "vitest"
import { ADMIN_NAV, buildAdminNav } from "./admin-nav"

describe("buildAdminNav", () => {
  test("renvoie tous les items principaux + le séparateur Organisme", () => {
    const nav = buildAdminNav()
    const ids = nav.filter((i) => "id" in i).map((i) => (i as { id: string }).id)
    expect(ids).toEqual([
      "home",
      "queue",
      "dossiers",
      "documents",
      "archives",
      "correspondance",
      "services",
      "annuaire",
      "equipe",
      "parametres",
    ])
    expect(nav.some((i) => "section" in i && i.section === "Organisme")).toBe(true)
  })

  test("sans badges : queue et correspondance n'ont pas de count", () => {
    const nav = buildAdminNav()
    const queue = nav.find(
      (i) => "id" in i && (i as { id: string }).id === "queue",
    )
    const correspondance = nav.find(
      (i) => "id" in i && (i as { id: string }).id === "correspondance",
    )
    expect((queue as { count?: number }).count).toBeUndefined()
    expect((correspondance as { count?: number }).count).toBeUndefined()
  })

  test("applique les badges fournis", () => {
    const nav = buildAdminNav({ queue: 42, correspondenceUnread: 7 })
    const queue = nav.find(
      (i) => "id" in i && (i as { id: string }).id === "queue",
    )
    const correspondance = nav.find(
      (i) => "id" in i && (i as { id: string }).id === "correspondance",
    )
    expect((queue as { count?: number }).count).toBe(42)
    expect((correspondance as { count?: number }).count).toBe(7)
  })

  test("accepte 0 comme valeur de badge (différencie absence vs zéro)", () => {
    const nav = buildAdminNav({ queue: 0, correspondenceUnread: 0 })
    const queue = nav.find(
      (i) => "id" in i && (i as { id: string }).id === "queue",
    )
    expect((queue as { count?: number }).count).toBe(0)
  })

  test("préserve le href de chaque item", () => {
    const nav = buildAdminNav()
    const home = nav.find((i) => "id" in i && (i as { id: string }).id === "home")
    expect((home as { href?: string }).href).toBe("/")
    const archives = nav.find(
      (i) => "id" in i && (i as { id: string }).id === "archives",
    )
    expect((archives as { href?: string }).href).toBe("/archives")
  })

  test("ADMIN_NAV est l'équivalent de buildAdminNav() sans badges", () => {
    expect(ADMIN_NAV).toEqual(buildAdminNav())
  })
})
