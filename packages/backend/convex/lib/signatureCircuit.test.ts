/**
 * Tests de la state machine du circuit de signature (ADR-0009).
 * Utilise convex-test pour fournir un ctx Convex en mémoire.
 */
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { modules } from "../test.setup"
import {
  approveStep,
  buildConventionCircuit,
  buildDocumentCircuit,
  cancelCircuit,
  createCircuit,
  getActiveStep,
  getCircuitWithSteps,
  refuseStep,
} from "./signatureCircuit"

interface CircuitFixture {
  instructeurId: Id<"agents">
  chefServiceId: Id<"agents">
  officierId: Id<"agents">
  documentId: Id<"documents">
  circuitId: Id<"signatureCircuits">
}

/**
 * Prépare un organisme + 3 agents + un document brouillon + un circuit
 * 3 étapes. Renvoie tous les IDs pour les tests.
 */
async function setupCircuit(t: ReturnType<typeof convexTest>): Promise<CircuitFixture> {
  return await t.run(async (ctx) => {
    const orgId = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      category: "direction_generale",
      status: "active",
    })
    const citizenId = await ctx.db.insert("citizens", {
      nip: "184127600504",
      name: "Marie OBAME",
      identityVerified: true,
      createdAt: Date.now(),
    })
    const instructeurId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "I1",
      name: "Yolande",
      email: "y@x",
      role: "agent_instructeur",
    })
    const chefServiceId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "C1",
      name: "Cyril",
      email: "c@x",
      role: "chef_service",
    })
    const officierId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "P1",
      name: "Patrice",
      email: "p@x",
      role: "officier_signataire",
    })
    const serviceId = await ctx.db.insert("services", {
      organismId: orgId,
      slug: "acte-naissance",
      title: "Acte de naissance",
      category: "État civil",
      fee: "Gratuit",
      delayHours: 48,
      status: "published",
    })
    const requestId = await ctx.db.insert("requests", {
      ref: "GC-T-001",
      citizenId,
      serviceId,
      organismId: orgId,
      status: "to_sign",
      progressPct: 75,
      depositedAt: Date.now(),
    })
    const documentId = await ctx.db.insert("documents", {
      actNumber: "EC-T-001",
      requestId,
      citizenId,
      issuedByAgentId: instructeurId,
      organismId: orgId,
      title: "Acte de naissance",
      status: "prepared",
      issuedAt: Date.now(),
      sha256: "deadbeef",
      qualifiedTimestamp: "now",
      qrCode: "GC-T",
      payload: {},
    })

    const circuitId = await createCircuit(ctx, {
      subjectKind: "document",
      subjectId: documentId,
      steps: buildDocumentCircuit({
        instructeurId,
        chefServiceId,
        officierId,
      }),
    })

    return { instructeurId, chefServiceId, officierId, documentId, circuitId }
  })
}

// ────────── createCircuit ──────────

describe("createCircuit", () => {
  test("crée 3 étapes ordonnées avec la première active", async () => {
    const t = convexTest(schema, modules)
    const { circuitId } = await setupCircuit(t)
    const { circuit, steps } = await t.run((ctx) =>
      getCircuitWithSteps(ctx, circuitId),
    )

    expect(circuit.status).toBe("active")
    expect(steps).toHaveLength(3)
    expect(steps[0].status).toBe("active")
    expect(steps[1].status).toBe("pending")
    expect(steps[2].status).toBe("pending")
    expect(steps.map((s) => s.assigneeRoleSnapshot)).toEqual([
      "agent_instructeur",
      "chef_service",
      "officier_signataire",
    ])
  })

  test("rejette un circuit sans étape", async () => {
    const t = convexTest(schema, modules)
    await expect(
      t.run((ctx) =>
        createCircuit(ctx, {
          subjectKind: "document",
          subjectId: "doc-x",
          steps: [],
        }),
      ),
    ).rejects.toThrowError(/au moins une étape/)
  })
})

// ────────── approveStep — walk complet ──────────

describe("approveStep", () => {
  test("approuve l'étape active et active la suivante", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)

    const res = await t.run((ctx) =>
      approveStep(ctx, { circuitId: f.circuitId, agentId: f.instructeurId }),
    )
    expect(res.circuitCompleted).toBe(false)

    const { steps } = await t.run((ctx) => getCircuitWithSteps(ctx, f.circuitId))
    expect(steps[0].status).toBe("done")
    expect(steps[1].status).toBe("active")
    expect(steps[2].status).toBe("pending")
  })

  test("walk complet : 3 approvals → circuit completed + document signé", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)

    await t.run((ctx) =>
      approveStep(ctx, { circuitId: f.circuitId, agentId: f.instructeurId }),
    )
    await t.run((ctx) =>
      approveStep(ctx, {
        circuitId: f.circuitId,
        agentId: f.chefServiceId,
        comment: "Visa OK",
      }),
    )
    const res = await t.run((ctx) =>
      approveStep(ctx, { circuitId: f.circuitId, agentId: f.officierId }),
    )
    expect(res.circuitCompleted).toBe(true)

    // onCircuitCompleted doit avoir patché le document
    const doc = await t.run((ctx) => ctx.db.get(f.documentId))
    expect(doc?.status).toBe("signed")
    expect(doc?.issuedAt).toBeGreaterThan(0)

    const { circuit, steps } = await t.run((ctx) =>
      getCircuitWithSteps(ctx, f.circuitId),
    )
    expect(circuit.status).toBe("completed")
    expect(circuit.completedAt).toBeGreaterThan(0)
    expect(steps.every((s) => s.status === "done")).toBe(true)
  })

  test("refuse l'approbation par un agent qui n'est pas l'assignee", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)
    await expect(
      t.run((ctx) =>
        approveStep(ctx, { circuitId: f.circuitId, agentId: f.officierId }),
      ),
    ).rejects.toThrowError(/assignee/)
  })

  test("stocke le commentaire sur l'étape validée", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)
    await t.run((ctx) =>
      approveStep(ctx, {
        circuitId: f.circuitId,
        agentId: f.instructeurId,
        comment: "Tout bon pour moi",
      }),
    )
    const { steps } = await t.run((ctx) => getCircuitWithSteps(ctx, f.circuitId))
    expect(steps[0].comment).toBe("Tout bon pour moi")
  })
})

// ────────── refuseStep ──────────

describe("refuseStep", () => {
  test("met le circuit en refused et garde la trace du motif", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)

    await t.run((ctx) =>
      refuseStep(ctx, {
        circuitId: f.circuitId,
        agentId: f.instructeurId,
        comment: "Pièces non conformes",
      }),
    )

    const { circuit, steps } = await t.run((ctx) =>
      getCircuitWithSteps(ctx, f.circuitId),
    )
    expect(circuit.status).toBe("refused")
    expect(steps[0].status).toBe("refused")
    expect(steps[0].comment).toBe("Pièces non conformes")
  })

  test("exige un commentaire non vide", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)
    await expect(
      t.run((ctx) =>
        refuseStep(ctx, {
          circuitId: f.circuitId,
          agentId: f.instructeurId,
          comment: "  ",
        }),
      ),
    ).rejects.toThrowError(/commentaire est requis/)
  })
})

// ────────── cancelCircuit ──────────

describe("cancelCircuit", () => {
  test("annule un circuit en cours et skip les étapes restantes", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)
    await t.run((ctx) =>
      cancelCircuit(ctx, f.circuitId, "Demande annulée par le citoyen"),
    )

    const { circuit, steps } = await t.run((ctx) =>
      getCircuitWithSteps(ctx, f.circuitId),
    )
    expect(circuit.status).toBe("cancelled")
    expect(circuit.cancellationReason).toBe("Demande annulée par le citoyen")
    expect(steps.every((s) => s.status === "skipped")).toBe(true)
  })

  test("est idempotent sur un circuit déjà terminé", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)
    await t.run((ctx) =>
      approveStep(ctx, { circuitId: f.circuitId, agentId: f.instructeurId }),
    )
    await t.run((ctx) =>
      approveStep(ctx, {
        circuitId: f.circuitId,
        agentId: f.chefServiceId,
        comment: "ok",
      }),
    )
    await t.run((ctx) =>
      approveStep(ctx, { circuitId: f.circuitId, agentId: f.officierId }),
    )
    // Circuit déjà completed → cancel ne doit pas le toucher
    await t.run((ctx) => cancelCircuit(ctx, f.circuitId, "tard"))
    const { circuit } = await t.run((ctx) =>
      getCircuitWithSteps(ctx, f.circuitId),
    )
    expect(circuit.status).toBe("completed")
  })
})

// ────────── getActiveStep ──────────

describe("getActiveStep", () => {
  test("retourne l'étape active du moment", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)
    const step = await t.run((ctx) => getActiveStep(ctx, f.circuitId))
    expect(step?.order).toBe(0)
    expect(step?.assigneeAgentId).toBe(f.instructeurId)
  })

  test("retourne null quand le circuit est terminé", async () => {
    const t = convexTest(schema, modules)
    const f = await setupCircuit(t)
    await t.run((ctx) =>
      approveStep(ctx, { circuitId: f.circuitId, agentId: f.instructeurId }),
    )
    await t.run((ctx) =>
      approveStep(ctx, {
        circuitId: f.circuitId,
        agentId: f.chefServiceId,
        comment: "ok",
      }),
    )
    await t.run((ctx) =>
      approveStep(ctx, { circuitId: f.circuitId, agentId: f.officierId }),
    )
    const step = await t.run((ctx) => getActiveStep(ctx, f.circuitId))
    expect(step).toBeNull()
  })
})

// ────────── buildConventionCircuit ──────────

describe("buildConventionCircuit", () => {
  test("produit 2 étapes (plateforme + DG organisme)", () => {
    const steps = buildConventionCircuit({
      platformAgentId: "p" as Id<"agents">,
      organismDgAgentId: "o" as Id<"agents">,
    })
    expect(steps).toHaveLength(2)
    expect(steps[0].assigneeRole).toBe("platform_admin")
    expect(steps[1].assigneeRole).toBe("admin_organisme")
  })
})
