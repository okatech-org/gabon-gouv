/**
 * Tests purs (sans convex-test) — `can()`, `assertCan()`, guards de rôle
 * sont des fonctions pures qui n'accèdent pas à la base.
 */
import { describe, expect, it } from "vitest"
import type { Id } from "../_generated/dataModel"
import {
  actorFromAgent,
  actorFromCitizen,
  assertCan,
  can,
  requireAgentRole,
  requireOwnCitizen,
  requireSameOrganism,
  SYSTEM_ACTOR,
  type Actor,
} from "./permissions"
import type { AgentRole } from "./enums"

// ────────── Fixtures ──────────

const citizenA: Actor = { kind: "citizen", citizenId: "c-A" as Id<"citizens"> }
const citizenB: Actor = { kind: "citizen", citizenId: "c-B" as Id<"citizens"> }

const agentOf = (role: AgentRole, orgId = "org-1"): Actor => ({
  kind: "agent",
  agentId: ("ag-" + role) as Id<"agents">,
  organismId: orgId as Id<"organisms">,
  role,
})

// ────────── can() — règle pure ──────────

describe("can()", () => {
  it("autorise un citoyen à déposer une demande", () => {
    expect(can(citizenA, "request.deposit")).toBe(true)
  })

  it("refuse à un citoyen de signer un document", () => {
    expect(can(citizenA, "document.sign")).toBe(false)
  })

  it("autorise tout agent à lire les demandes de son organisme", () => {
    for (const role of [
      "agent_instructeur",
      "agent_superviseur",
      "chef_service",
      "officier_signataire",
      "admin_organisme",
      "admin_technique",
    ] as AgentRole[]) {
      expect(can(agentOf(role), "request.read.organism")).toBe(true)
    }
  })

  it("seul l'officier_signataire (et plus) peut signer un document", () => {
    expect(can(agentOf("agent_instructeur"), "document.sign")).toBe(false)
    expect(can(agentOf("agent_superviseur"), "document.sign")).toBe(false)
    expect(can(agentOf("chef_service"), "document.sign")).toBe(false)
    expect(can(agentOf("officier_signataire"), "document.sign")).toBe(true)
    expect(can(agentOf("admin_organisme"), "document.sign")).toBe(true)
  })

  it("seul chef_service+ peut rejeter une demande", () => {
    expect(can(agentOf("agent_instructeur"), "request.reject")).toBe(false)
    expect(can(agentOf("agent_superviseur"), "request.reject")).toBe(false)
    expect(can(agentOf("chef_service"), "request.reject")).toBe(true)
    expect(can(agentOf("officier_signataire"), "request.reject")).toBe(true)
  })

  it("admin_organisme peut publier des services, pas officier_signataire", () => {
    expect(can(agentOf("officier_signataire"), "service.publish")).toBe(false)
    expect(can(agentOf("admin_organisme"), "service.publish")).toBe(true)
  })

  it("admin_technique a très peu de droits métier", () => {
    expect(can(agentOf("admin_technique"), "request.read.organism")).toBe(true)
    expect(can(agentOf("admin_technique"), "request.reject")).toBe(false)
    expect(can(agentOf("admin_technique"), "document.sign")).toBe(false)
  })

  it("platform_admin peut suspendre un organisme (cross-org)", () => {
    expect(can(agentOf("platform_admin"), "organism.suspend")).toBe(true)
    expect(can(agentOf("admin_organisme"), "organism.suspend")).toBe(false)
  })

  it("system actor peut tout faire", () => {
    expect(can(SYSTEM_ACTOR, "document.sign")).toBe(true)
    expect(can(SYSTEM_ACTOR, "archive.eliminate_visa")).toBe(true)
  })

  it("seul platform_admin peut donner le visa DGAN d'élimination", () => {
    expect(can(agentOf("admin_organisme"), "archive.eliminate_visa")).toBe(false)
    expect(can(agentOf("platform_admin"), "archive.eliminate_visa")).toBe(true)
  })
})

// ────────── assertCan() ──────────

describe("assertCan()", () => {
  it("ne throw pas quand autorisé", () => {
    expect(() => assertCan(citizenA, "request.deposit")).not.toThrow()
  })

  it("throw avec un message explicite quand refusé", () => {
    expect(() => assertCan(citizenA, "document.sign")).toThrowError(
      /Action "document.sign" refusée/,
    )
  })
})

// ────────── Guards composés ──────────

describe("requireSameOrganism()", () => {
  it("passe quand l'agent appartient à l'organisme cible", () => {
    const agent = agentOf("chef_service", "org-1")
    expect(() =>
      requireSameOrganism(agent, "org-1" as Id<"organisms">),
    ).not.toThrow()
  })

  it("throw quand l'agent est d'un autre organisme", () => {
    const agent = agentOf("chef_service", "org-1")
    expect(() =>
      requireSameOrganism(agent, "org-2" as Id<"organisms">),
    ).toThrowError(/n'appartient pas/)
  })

  it("throw quand l'acteur n'est pas un agent", () => {
    expect(() =>
      requireSameOrganism(citizenA, "org-1" as Id<"organisms">),
    ).toThrowError(/réservée aux agents/)
  })
})

describe("requireAgentRole()", () => {
  it("accepte les rôles attendus", () => {
    const chef = agentOf("chef_service")
    expect(() => requireAgentRole(chef, "chef_service")).not.toThrow()
    expect(() =>
      requireAgentRole(chef, "agent_instructeur", "chef_service"),
    ).not.toThrow()
  })

  it("refuse les rôles non listés", () => {
    const agent = agentOf("agent_instructeur")
    expect(() => requireAgentRole(agent, "officier_signataire")).toThrowError(
      /rôle actuel/,
    )
  })

  it("refuse si l'acteur n'est pas un agent", () => {
    expect(() => requireAgentRole(citizenA, "agent_instructeur")).toThrowError(
      /réservée aux agents/,
    )
  })
})

describe("requireOwnCitizen()", () => {
  it("accepte le citoyen propriétaire", () => {
    expect(() =>
      requireOwnCitizen(citizenA, "c-A" as Id<"citizens">),
    ).not.toThrow()
  })

  it("refuse un autre citoyen", () => {
    expect(() =>
      requireOwnCitizen(citizenA, citizenB.kind === "citizen" ? citizenB.citizenId : ("c-X" as Id<"citizens">)),
    ).toThrowError(/d'un autre citoyen/)
  })

  it("refuse un agent", () => {
    expect(() =>
      requireOwnCitizen(agentOf("chef_service"), "c-A" as Id<"citizens">),
    ).toThrowError(/réservée au citoyen propriétaire/)
  })
})

// ────────── Helpers de construction ──────────

describe("actorFromAgent / actorFromCitizen", () => {
  it("construit un Actor agent à partir d'un doc", () => {
    const actor = actorFromAgent({
      _id: "ag-1" as Id<"agents">,
      organismId: "org-1" as Id<"organisms">,
      role: "chef_service",
    })
    expect(actor).toEqual({
      kind: "agent",
      agentId: "ag-1",
      organismId: "org-1",
      role: "chef_service",
    })
  })

  it("construit un Actor citoyen", () => {
    const actor = actorFromCitizen("c-1" as Id<"citizens">)
    expect(actor).toEqual({ kind: "citizen", citizenId: "c-1" })
  })
})
