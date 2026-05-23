/**
 * Tests des mutations métier admin + vérification que les agrégats Convex
 * (ADR-0007) sont mis à jour automatiquement par les triggers.
 */
import { convexTest } from "convex-test"
import { beforeEach, describe, expect, test } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { registerAggregates } from "../lib/test-helpers"
import { triggers } from "../lib/triggers"
import { modules } from "../test.setup"

interface Fixture {
  t: ReturnType<typeof convexTest>
  orgId: Id<"organisms">
  otherOrgId: Id<"organisms">
  yolandeToken: string
  yolandeId: Id<"agents">
  cyrilToken: string
  cyrilId: Id<"agents">
  patriceToken: string
  patriceId: Id<"agents">
  louisId: Id<"agents">
  serviceId: Id<"services">
  citizenId: Id<"citizens">
  ref: string
  requestId: Id<"requests">
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)

  // On wrappe le ctx avec les triggers pour que le seed alimente les agrégats
  // (sinon les inserts via `t.run` bypassent les triggers du mutation wrapper).
  const seeded = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    const orgId = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      shortName: "DG EC",
      category: "direction_generale",
      status: "active",
    })
    const otherOrgId = await ctx.db.insert("organisms", {
      name: "DG Documentation",
      category: "direction_generale",
      status: "active",
    })
    const yolandeId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "198501100001",
      name: "Yolande",
      email: "y@x",
      role: "agent_instructeur",
    })
    const cyrilId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "197603100002",
      name: "Cyril",
      email: "c@x",
      role: "chef_service",
    })
    const patriceId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "196812100003",
      name: "Patrice",
      email: "p@x",
      role: "officier_signataire",
    })
    const louisId = await ctx.db.insert("agents", {
      organismId: orgId,
      nip: "198909100004",
      name: "Louis",
      email: "l@x",
      role: "agent_instructeur",
    })
    const citizenId = await ctx.db.insert("citizens", {
      nip: "184127600504",
      name: "Marie OBAME",
      identityVerified: true,
      createdAt: Date.now(),
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
    const ref = "GC-T-001"
    const requestId = await ctx.db.insert("requests", {
      ref,
      citizenId,
      serviceId,
      organismId: orgId,
      assignedAgentId: yolandeId,
      status: "in_instruction",
      progressPct: 30,
      depositedAt: Date.now(),
    })
    return {
      orgId,
      otherOrgId,
      yolandeId,
      cyrilId,
      patriceId,
      louisId,
      serviceId,
      citizenId,
      ref,
      requestId,
    }
  })

  // Login chacun
  const yolande = await t.mutation(api.auth.signInWithNip, { nip: "198501100001" })
  const cyril = await t.mutation(api.auth.signInWithNip, { nip: "197603100002" })
  const patrice = await t.mutation(api.auth.signInWithNip, { nip: "196812100003" })

  return {
    t,
    ...seeded,
    yolandeToken: yolande.token,
    cyrilToken: cyril.token,
    patriceToken: patrice.token,
  }
}

// ====================================================================
// assignRequest
// ====================================================================

describe("assignRequest", () => {
  test("réassigne la demande et émet un event", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.mutations.assignRequest, {
      token: f.yolandeToken,
      ref: f.ref,
      agentId: f.louisId,
    })
    const req = await f.t.run((ctx) => ctx.db.get(f.requestId))
    expect(req?.assignedAgentId).toBe(f.louisId)

    const events = await f.t.run((ctx) =>
      ctx.db
        .query("requestEvents")
        .withIndex("by_request_time", (q) => q.eq("requestId", f.requestId))
        .collect(),
    )
    expect(events.some((e) => e.kind === "assignment")).toBe(true)
  })

  test("met à jour l'agrégat aggRequestsByOrgAgent automatiquement", async () => {
    const f = await buildFixture()
    const beforeYolande = await f.t.query(api.admin.dashboard.getSidebarCounts, {
      token: f.yolandeToken,
    })
    expect(beforeYolande.assignedToMe).toBe(1)

    await f.t.mutation(api.admin.mutations.assignRequest, {
      token: f.yolandeToken,
      ref: f.ref,
      agentId: f.louisId,
    })

    const afterYolande = await f.t.query(api.admin.dashboard.getSidebarCounts, {
      token: f.yolandeToken,
    })
    expect(afterYolande.assignedToMe).toBe(0)
  })

  test("refuse de réassigner à un agent d'un autre organisme", async () => {
    const f = await buildFixture()
    const otherAgent = await f.t.run((ctx) =>
      ctx.db.insert("agents", {
        organismId: f.otherOrgId,
        nip: "X",
        name: "Étranger",
        email: "x@y",
        role: "agent_instructeur",
      }),
    )
    await expect(
      f.t.mutation(api.admin.mutations.assignRequest, {
        token: f.yolandeToken,
        ref: f.ref,
        agentId: otherAgent,
      }),
    ).rejects.toThrowError(/Agent cible invalide/)
  })
})

// ====================================================================
// requestPiece
// ====================================================================

describe("requestPiece", () => {
  test("crée une pièce missing + bascule la demande en waiting_pieces", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.mutations.requestPiece, {
      token: f.yolandeToken,
      ref: f.ref,
      label: "Justificatif de domicile",
    })
    const req = await f.t.run((ctx) => ctx.db.get(f.requestId))
    expect(req?.status).toBe("waiting_pieces")

    const pieces = await f.t.run((ctx) =>
      ctx.db
        .query("pieces")
        .withIndex("by_request", (q) => q.eq("requestId", f.requestId))
        .collect(),
    )
    expect(pieces.some((p) => p.label === "Justificatif de domicile" && p.status === "missing")).toBe(true)
  })
})

// ====================================================================
// validatePiece / rejectPiece
// ====================================================================

describe("validatePiece", () => {
  test("valide une pièce et fait sortir de waiting_pieces si plus rien manque", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.mutations.requestPiece, {
      token: f.yolandeToken,
      ref: f.ref,
      label: "Pièce 1",
    })
    const pieces = await f.t.run((ctx) =>
      ctx.db
        .query("pieces")
        .withIndex("by_request", (q) => q.eq("requestId", f.requestId))
        .collect(),
    )
    const pieceId = pieces.find((p) => p.label === "Pièce 1")!._id

    // Téléverse (simule l'upload citoyen)
    await f.t.run((ctx) => ctx.db.patch(pieceId, { status: "uploaded" }))

    await f.t.mutation(api.admin.mutations.validatePiece, {
      token: f.yolandeToken,
      pieceId,
    })

    const piece = await f.t.run((ctx) => ctx.db.get(pieceId))
    expect(piece?.status).toBe("validated")
    expect(piece?.validatedByAgentId).toBe(f.yolandeId)

    const req = await f.t.run((ctx) => ctx.db.get(f.requestId))
    expect(req?.status).toBe("in_instruction")
  })
})

describe("rejectPiece", () => {
  test("exige un motif non vide", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.mutations.requestPiece, {
      token: f.yolandeToken,
      ref: f.ref,
      label: "P",
    })
    const pieces = await f.t.run((ctx) =>
      ctx.db
        .query("pieces")
        .withIndex("by_request", (q) => q.eq("requestId", f.requestId))
        .collect(),
    )
    const pieceId = pieces[0]._id
    await expect(
      f.t.mutation(api.admin.mutations.rejectPiece, {
        token: f.yolandeToken,
        pieceId,
        reason: "  ",
      }),
    ).rejects.toThrowError(/motif est requis/)
  })

  test("rejette la pièce et remet la demande en waiting_pieces", async () => {
    const f = await buildFixture()
    const pieceId = await f.t.run((ctx) =>
      ctx.db.insert("pieces", {
        requestId: f.requestId,
        label: "P",
        status: "uploaded",
        required: true,
      }),
    )
    await f.t.mutation(api.admin.mutations.rejectPiece, {
      token: f.yolandeToken,
      pieceId,
      reason: "Document illisible",
    })
    const piece = await f.t.run((ctx) => ctx.db.get(pieceId))
    expect(piece?.status).toBe("rejected")
    expect(piece?.rejectionReason).toBe("Document illisible")
  })
})

// ====================================================================
// rejectRequest
// ====================================================================

describe("rejectRequest", () => {
  test("refuse un instructeur (rôle insuffisant)", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.mutations.rejectRequest, {
        token: f.yolandeToken,
        ref: f.ref,
        reason: "Fraude présumée",
      }),
    ).rejects.toThrowError(/refusée/)
  })

  test("autorise un chef_service à rejeter avec motif", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.mutations.rejectRequest, {
      token: f.cyrilToken,
      ref: f.ref,
      reason: "Dossier incomplet",
    })
    const req = await f.t.run((ctx) => ctx.db.get(f.requestId))
    expect(req?.status).toBe("rejected")
    expect(req?.rejectionReason).toBe("Dossier incomplet")
    expect(req?.progressPct).toBe(0)
  })

  test("exige un motif", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.mutations.rejectRequest, {
        token: f.cyrilToken,
        ref: f.ref,
        reason: "",
      }),
    ).rejects.toThrowError(/motif de rejet/)
  })
})

// ====================================================================
// prepareDocument + circuit complet
// ====================================================================

describe("prepareDocument + circuit", () => {
  test("crée le document brouillon et ouvre un circuit 3 étapes", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.admin.mutations.prepareDocument, {
      token: f.yolandeToken,
      ref: f.ref,
      chefServiceId: f.cyrilId,
      officierId: f.patriceId,
    })
    expect(res.actNumber).toMatch(/^EC-LBV-\d{4}-\d{5}$/)

    const doc = await f.t.run((ctx) => ctx.db.get(res.documentId))
    expect(doc?.status).toBe("prepared")
    expect(doc?.signatureCircuitId).toBe(res.circuitId)

    const req = await f.t.run((ctx) => ctx.db.get(f.requestId))
    expect(req?.status).toBe("to_sign")
  })

  test("walk complet : 3 approvals → document signed", async () => {
    const f = await buildFixture()
    const { circuitId, documentId } = await f.t.mutation(
      api.admin.mutations.prepareDocument,
      {
        token: f.yolandeToken,
        ref: f.ref,
        chefServiceId: f.cyrilId,
        officierId: f.patriceId,
      },
    )

    await f.t.mutation(api.admin.mutations.approveSignatureStep, {
      token: f.yolandeToken,
      circuitId,
    })
    await f.t.mutation(api.admin.mutations.approveSignatureStep, {
      token: f.cyrilToken,
      circuitId,
      comment: "Visa OK",
    })
    const final = await f.t.mutation(api.admin.mutations.approveSignatureStep, {
      token: f.patriceToken,
      circuitId,
    })
    expect(final.circuitCompleted).toBe(true)

    const doc = await f.t.run((ctx) => ctx.db.get(documentId))
    expect(doc?.status).toBe("signed")
  })
})

// ====================================================================
// sendCorrespondence
// ====================================================================

describe("sendCorrespondence", () => {
  test("crée correspondance + 1er message", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.admin.mutations.sendCorrespondence, {
      token: f.yolandeToken,
      toOrgId: f.otherOrgId,
      subject: "Demande d'auth",
      body: "Bonjour…",
      urgent: false,
      confidentiality: "restricted",
      archivePolicy: "2 ans",
      signed: true,
    })
    expect(res.ref).toMatch(/^CR-\d{4}-\d{4}$/)

    const messages = await f.t.run((ctx) =>
      ctx.db
        .query("correspondenceMessages")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", res.correspondenceId),
        )
        .collect(),
    )
    expect(messages).toHaveLength(1)
    expect(messages[0].signed).toBe(true)
    expect(messages[0].fromAgentId).toBe(f.yolandeId)
  })
})

// ====================================================================
// verseToSAE — idempotence
// ====================================================================

describe("verseToSAE", () => {
  let f: Fixture
  let documentId: Id<"documents">

  beforeEach(async () => {
    f = await buildFixture()
    const res = await f.t.mutation(api.admin.mutations.prepareDocument, {
      token: f.yolandeToken,
      ref: f.ref,
      chefServiceId: f.cyrilId,
      officierId: f.patriceId,
    })
    documentId = res.documentId
  })

  test("refuse un agent_instructeur", async () => {
    await expect(
      f.t.mutation(api.admin.mutations.verseToSAE, {
        token: f.yolandeToken,
        documentId,
      }),
    ).rejects.toThrowError(/rôles autorisés/)
  })

  test("verse au SAE pour un officier, idempotent au 2e appel", async () => {
    const r1 = await f.t.mutation(api.admin.mutations.verseToSAE, {
      token: f.patriceToken,
      documentId,
    })
    expect(r1.already).toBe(false)
    expect(r1.cote).toMatch(/^GA\//)

    const r2 = await f.t.mutation(api.admin.mutations.verseToSAE, {
      token: f.patriceToken,
      documentId,
    })
    expect(r2.already).toBe(true)
    expect(r2.archiveId).toBe(r1.archiveId)
  })
})

// ====================================================================
// Dashboard — agrégats live
// ====================================================================

describe("dashboard agrégats", () => {
  test("getDashboard reflète l'état après prepareDocument (to_sign +1)", async () => {
    const f = await buildFixture()
    const beforeKpi = await f.t.query(api.admin.dashboard.getDashboard, {
      token: f.yolandeToken,
    })
    const beforeInProgress = Number(
      beforeKpi.kpis.find((k) => k.label === "En cours")?.value,
    )

    await f.t.mutation(api.admin.mutations.prepareDocument, {
      token: f.yolandeToken,
      ref: f.ref,
      chefServiceId: f.cyrilId,
      officierId: f.patriceId,
    })

    const afterKpi = await f.t.query(api.admin.dashboard.getDashboard, {
      token: f.yolandeToken,
    })
    const afterInProgress = Number(
      afterKpi.kpis.find((k) => k.label === "En cours")?.value,
    )
    // La demande reste « En cours » (to_sign fait partie de IN_PROGRESS_STATUSES)
    expect(afterInProgress).toBe(beforeInProgress)
  })

  test("rejectRequest fait sortir de En cours", async () => {
    const f = await buildFixture()
    const before = await f.t.query(api.admin.dashboard.getDashboard, {
      token: f.yolandeToken,
    })
    const beforeInProgress = Number(
      before.kpis.find((k) => k.label === "En cours")?.value,
    )

    await f.t.mutation(api.admin.mutations.rejectRequest, {
      token: f.cyrilToken,
      ref: f.ref,
      reason: "test",
    })

    const after = await f.t.query(api.admin.dashboard.getDashboard, {
      token: f.yolandeToken,
    })
    const afterInProgress = Number(
      after.kpis.find((k) => k.label === "En cours")?.value,
    )
    expect(afterInProgress).toBe(beforeInProgress - 1)
  })
})
