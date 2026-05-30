/**
 * Tests Bloc 3 — traitement complet d'une demande.
 *
 * Couvre les ajouts/refontes du Bloc 3 :
 *   - setVerificationStatus + seedDefaultVerifications à submitRequest
 *   - getInstruction enrichi (variant, document, circuit)
 *   - finalizeIssuance (raccourci signAndIssue + via dernier approveStep)
 *   - URLs signées (admin pieces, admin/citizen PDF documents)
 *   - listMySignatures + countMyPending
 */
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { convexTest, type TestConvex } from "convex-test"
import type { GenericSchema, SchemaDefinition } from "convex/server"
import { describe, expect, test } from "vitest"
import { api } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { triggers } from "../lib/triggers"
import { modules } from "../test.setup"

const AGGREGATE_NAMES = [
  "aggCitizensGlobal",
  "aggRequestsGlobal",
  "aggDocumentsGlobal",
  "aggArchivesGlobal",
  "aggRequestsByOrg",
  "aggDocumentsByOrg",
  "aggRequestsByOrgStatus",
  "aggArchivesByOrgStatus",
  "aggRequestsByOrgAgent",
  "aggRequestsByService",
  "aggRequestsByServiceVariant",
  "aggOrgsByStatus",
  "aggNotifsUnread",
] as const

function registerAggregates(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
): void {
  for (const name of AGGREGATE_NAMES) registerAggregate(t, name)
}

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
  marieSub: string
  ref: string
  requestId: Id<"requests">
}

/**
 * Fixture commune : organisme, 4 agents (instructeur Yolande, chef Cyril,
 * officier Patrice, instructeur Louis), citoyenne Marie avec sub IDN, 1
 * service publié, 1 demande déjà en `in_instruction` SANS pieces ni vérifs
 * (les tests qui en ont besoin les ajoutent eux-mêmes).
 */
async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)

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
      idnSub: "idn-marie",
      name: "Marie OBAME",
      identityVerified: true,
      createdAt: Date.now(),
    })
    const serviceId = await ctx.db.insert("services", {
      organismId: orgId,
      categorySlug: "etat-civil",
      slug: "acte-naissance",
      title: "Acte de naissance",
      category: "État civil",
      fee: "Gratuit",
      delayHours: 48,
      status: "published",
    })
    const ref = "GC-BLOC3-001"
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

  const yolande = await t.mutation(api.auth.signInWithNip, {
    nip: "198501100001",
  })
  const cyril = await t.mutation(api.auth.signInWithNip, {
    nip: "197603100002",
  })
  const patrice = await t.mutation(api.auth.signInWithNip, {
    nip: "196812100003",
  })

  return {
    t,
    ...seeded,
    marieSub: "idn-marie",
    yolandeToken: yolande.token,
    cyrilToken: cyril.token,
    patriceToken: patrice.token,
  }
}

// ====================================================================
// seedDefaultVerifications (via submitRequest)
// ====================================================================

describe("submitRequest → vérifications stub", () => {
  test("insère 3 vérifications par défaut, identity=ok si identityVerified", async () => {
    const f = await buildFixture()
    const res = await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.requests.submitRequest, {
        serviceSlug: "acte-naissance",
        consents: { honor: true, rgpd: true },
      })

    const verifs = await f.t.run((ctx) =>
      ctx.db
        .query("verifications")
        .withIndex("by_request", (q) => q.eq("requestId", res.requestId))
        .collect(),
    )
    expect(verifs).toHaveLength(3)
    const identity = verifs.find((v) => v.kind === "identity")
    expect(identity?.status).toBe("ok")
    expect(identity?.evidence).toBe("IDN OAuth")
    expect(verifs.find((v) => v.kind === "data_consistency")?.status).toBe(
      "pending",
    )
    expect(verifs.find((v) => v.kind === "duplicate_detection")?.status).toBe(
      "pending",
    )
  })

  test("identity=pending si le citoyen n'a pas identityVerified", async () => {
    const f = await buildFixture()
    // Patche Marie pour retirer identityVerified
    await f.t.run((ctx) => ctx.db.patch(f.citizenId, { identityVerified: false }))
    const res = await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.requests.submitRequest, {
        serviceSlug: "acte-naissance",
        consents: { honor: true, rgpd: true },
      })
    const verifs = await f.t.run((ctx) =>
      ctx.db
        .query("verifications")
        .withIndex("by_request", (q) => q.eq("requestId", res.requestId))
        .collect(),
    )
    expect(verifs.find((v) => v.kind === "identity")?.status).toBe("pending")
  })
})

// ====================================================================
// setVerificationStatus
// ====================================================================

describe("setVerificationStatus", () => {
  test("met à jour le statut + insère un requestEvent", async () => {
    const f = await buildFixture()
    const vid = await f.t.run((ctx) =>
      ctx.db.insert("verifications", {
        requestId: f.requestId,
        title: "Croisement registre",
        description: "Test",
        kind: "registry_match",
        status: "pending",
        order: 0,
      }),
    )
    await f.t.mutation(api.admin.mutations.setVerificationStatus, {
      token: f.yolandeToken,
      verificationId: vid,
      status: "ok",
      evidence: "RGPP confirmé",
    })

    const v = await f.t.run((ctx) => ctx.db.get(vid))
    expect(v?.status).toBe("ok")
    expect(v?.evidence).toBe("RGPP confirmé")
    expect(v?.performedAt).toBeGreaterThan(0)
    expect(v?.performedByAgentId).toBe(f.yolandeId)

    const events = await f.t.run((ctx) =>
      ctx.db
        .query("requestEvents")
        .withIndex("by_request_time", (q) => q.eq("requestId", f.requestId))
        .collect(),
    )
    expect(events.some((e) => e.kind === "verification")).toBe(true)
  })

  test("refuse une vérif d'un autre organisme", async () => {
    const f = await buildFixture()
    const otherRequestId = await f.t.run((ctx) =>
      ctx.db.insert("requests", {
        ref: "OTHER-001",
        citizenId: f.citizenId,
        serviceId: f.serviceId,
        organismId: f.otherOrgId,
        status: "in_instruction",
        progressPct: 10,
        depositedAt: Date.now(),
      }),
    )
    const vid = await f.t.run((ctx) =>
      ctx.db.insert("verifications", {
        requestId: otherRequestId,
        title: "T",
        description: "",
        status: "pending",
        order: 0,
      }),
    )
    await expect(
      f.t.mutation(api.admin.mutations.setVerificationStatus, {
        token: f.yolandeToken,
        verificationId: vid,
        status: "ok",
      }),
    ).rejects.toThrowError(/périmètre/)
  })
})

// ====================================================================
// signAndIssue refondu — préconditions + finalizeIssuance
// ====================================================================

describe("signAndIssue (raccourci)", () => {
  test("refuse si pièces required non validées", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.insert("pieces", {
        requestId: f.requestId,
        label: "CNI",
        status: "uploaded",
        required: true,
      }),
    )
    await expect(
      f.t.mutation(api.admin.mutations.signAndIssue, {
        token: f.patriceToken,
        ref: f.ref,
      }),
    ).rejects.toThrowError(/pièce/)
  })

  test("refuse si vérifs non finalisées", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.insert("verifications", {
        requestId: f.requestId,
        title: "Test",
        description: "",
        status: "pending",
        order: 0,
      }),
    )
    await expect(
      f.t.mutation(api.admin.mutations.signAndIssue, {
        token: f.patriceToken,
        ref: f.ref,
      }),
    ).rejects.toThrowError(/vérification/)
  })

  test("refuse pour un instructeur (permission document.issue)", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.mutations.signAndIssue, {
        token: f.yolandeToken,
        ref: f.ref,
      }),
    ).rejects.toThrowError(/document\.issue|refusée/)
  })

  test("refuse si service a un circuit multi-étapes", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.patch(f.serviceId, {
        defaultSignatureCircuitTemplate: {
          steps: [
            { roleRequired: "agent_instructeur", order: 0 },
            { roleRequired: "chef_service", order: 1 },
          ],
        },
      }),
    )
    await expect(
      f.t.mutation(api.admin.mutations.signAndIssue, {
        token: f.patriceToken,
        ref: f.ref,
      }),
    ).rejects.toThrowError(/multi-étapes/)
  })

  test("happy path : document issued + archive squelette + notif citoyen", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(api.admin.mutations.signAndIssue, {
      token: f.patriceToken,
      ref: f.ref,
    })
    expect(res.actNumber).toMatch(/^EC-LBV-\d{4}-\d{5}$/)
    expect(res.verificationCode).toMatch(/^GC-[A-Z]{2}-\d{4}$/)
    expect(res.sha256).toHaveLength(64)

    const req = await f.t.run((ctx) => ctx.db.get(f.requestId))
    expect(req?.status).toBe("issued")
    expect(req?.progressPct).toBe(100)

    const doc = await f.t.run((ctx) =>
      ctx.db
        .query("documents")
        .withIndex("by_request", (q) => q.eq("requestId", f.requestId))
        .first(),
    )
    expect(doc?.status).toBe("issued")
    expect(doc?.verificationCode).toBe(res.verificationCode)

    const archive = await f.t.run((ctx) =>
      ctx.db
        .query("archives")
        .withIndex("by_organism_status", (q) =>
          q.eq("producerOrganismId", f.orgId).eq("status", "active"),
        )
        .filter((q) => q.eq(q.field("linkedDocumentId"), doc!._id))
        .first(),
    )
    expect(archive).not.toBeNull()
    expect(archive?.sha256).toBe(res.sha256)

    const notif = await f.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_time", (q) =>
          q.eq("recipientKind", "citizen").eq("recipientId", String(f.citizenId)),
        )
        .collect(),
    )
    expect(notif.some((n) => n.kind === "document_ready")).toBe(true)
  })
})

// ====================================================================
// prepareDocument + walk circuit + finalizeIssuance
// ====================================================================

describe("prepareDocument avec template dynamique", () => {
  test("résout les assignees depuis defaultSignatureCircuitTemplate", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.patch(f.serviceId, {
        defaultSignatureCircuitTemplate: {
          steps: [
            { roleRequired: "agent_instructeur", order: 0 },
            { roleRequired: "chef_service", order: 1 },
            { roleRequired: "officier_signataire", order: 2 },
          ],
        },
      }),
    )
    const res = await f.t.mutation(api.admin.mutations.prepareDocument, {
      token: f.yolandeToken,
      ref: f.ref,
    })
    expect(res.circuitId).toBeDefined()

    const steps = await f.t.run((ctx) =>
      ctx.db
        .query("signatureCircuitSteps")
        .withIndex("by_circuit_order", (q) => q.eq("circuitId", res.circuitId))
        .collect(),
    )
    expect(steps).toHaveLength(3)
    expect(steps.map((s) => s.assigneeRoleSnapshot)).toEqual([
      "agent_instructeur",
      "chef_service",
      "officier_signataire",
    ])
  })

  test("throw si l'organisme n'a pas d'agent du rôle requis", async () => {
    const f = await buildFixture()
    await f.t.run((ctx) =>
      ctx.db.patch(f.serviceId, {
        defaultSignatureCircuitTemplate: {
          steps: [{ roleRequired: "admin_technique", order: 0 }],
        },
      }),
    )
    await expect(
      f.t.mutation(api.admin.mutations.prepareDocument, {
        token: f.yolandeToken,
        ref: f.ref,
      }),
    ).rejects.toThrowError(/admin_technique/)
  })

  test("refuseSignatureStep rebascule la demande à in_instruction", async () => {
    const f = await buildFixture()
    const { circuitId } = await f.t.mutation(
      api.admin.mutations.prepareDocument,
      {
        token: f.yolandeToken,
        ref: f.ref,
        chefServiceId: f.cyrilId,
        officierId: f.patriceId,
      },
    )
    // L'instructeur valide son step (le 0)
    await f.t.mutation(api.admin.mutations.approveSignatureStep, {
      token: f.yolandeToken,
      circuitId,
    })
    // Le chef refuse
    await f.t.mutation(api.admin.mutations.refuseSignatureStep, {
      token: f.cyrilToken,
      circuitId,
      comment: "Données incohérentes",
    })

    const req = await f.t.run((ctx) => ctx.db.get(f.requestId))
    expect(req?.status).toBe("in_instruction")
    expect(req?.progressPct).toBe(50)

    const events = await f.t.run((ctx) =>
      ctx.db
        .query("requestEvents")
        .withIndex("by_request_time", (q) => q.eq("requestId", f.requestId))
        .collect(),
    )
    expect(
      events.some(
        (e) => e.kind === "status_change" && e.title?.includes("refusé"),
      ),
    ).toBe(true)

    // Notification au préparateur (Yolande) car Cyril ≠ Yolande
    const notifs = await f.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_time", (q) =>
          q.eq("recipientKind", "agent").eq("recipientId", String(f.yolandeId)),
        )
        .collect(),
    )
    expect(notifs.some((n) => n.kind === "request_status_change")).toBe(true)
  })
})

// ====================================================================
// getInstruction enrichi
// ====================================================================

describe("getInstruction enrichi", () => {
  test("renvoie variant + document + circuit quand prepareDocument a tourné", async () => {
    const f = await buildFixture()
    // Ajouter variant + lier à la demande
    const variantId = await f.t.run(async (ctx) => {
      const vid = await ctx.db.insert("serviceVariants", {
        serviceId: f.serviceId,
        key: "copie_integrale",
        label: "Copie intégrale",
        isDefault: true,
        order: 0,
      })
      await ctx.db.patch(f.requestId, { serviceVariantId: vid })
      return vid
    })

    await f.t.mutation(api.admin.mutations.prepareDocument, {
      token: f.yolandeToken,
      ref: f.ref,
      chefServiceId: f.cyrilId,
      officierId: f.patriceId,
    })

    const detail = await f.t.query(api.admin.requests.getInstruction, {
      token: f.yolandeToken,
      ref: f.ref,
    })
    expect(detail).not.toBeNull()
    expect(detail?.variant?.id).toBe(variantId)
    expect(detail?.variant?.key).toBe("copie_integrale")
    expect(detail?.document?.status).toBe("prepared")
    expect(detail?.circuit?.steps).toHaveLength(3)
    expect(detail?.circuit?.steps[0]?.status).toBe("active")
  })

  test("document et circuit à null tant que prepareDocument n'a pas tourné", async () => {
    const f = await buildFixture()
    const detail = await f.t.query(api.admin.requests.getInstruction, {
      token: f.yolandeToken,
      ref: f.ref,
    })
    expect(detail?.document).toBeFalsy()
    expect(detail?.circuit).toBeNull()
  })

  test("expose pieces[].id et hasFile pour le viewer", async () => {
    const f = await buildFixture()
    const pid = await f.t.run((ctx) =>
      ctx.db.insert("pieces", {
        requestId: f.requestId,
        label: "CNI",
        status: "uploaded",
        required: true,
        storageKey: "fake-storage-key",
        mimeType: "application/pdf",
      }),
    )
    const detail = await f.t.query(api.admin.requests.getInstruction, {
      token: f.yolandeToken,
      ref: f.ref,
    })
    const piece = detail?.pieces.find((p) => p.id === pid)
    expect(piece).toBeDefined()
    expect(piece?.hasFile).toBe(true)
    expect(piece?.mimeType).toBe("application/pdf")
  })
})

// ====================================================================
// URLs signées
// ====================================================================

describe("getPieceViewUrl", () => {
  test("renvoie null si la pièce n'a pas de fichier", async () => {
    const f = await buildFixture()
    const pid = await f.t.run((ctx) =>
      ctx.db.insert("pieces", {
        requestId: f.requestId,
        label: "À fournir",
        status: "missing",
        required: true,
      }),
    )
    const res = await f.t.query(api.admin.requests.getPieceViewUrl, {
      token: f.yolandeToken,
      pieceId: pid,
    })
    expect(res).toBeNull()
  })

  test("refuse si la pièce est hors de l'organisme", async () => {
    const f = await buildFixture()
    const otherRequestId = await f.t.run((ctx) =>
      ctx.db.insert("requests", {
        ref: "OTHER-002",
        citizenId: f.citizenId,
        serviceId: f.serviceId,
        organismId: f.otherOrgId,
        status: "in_instruction",
        progressPct: 10,
        depositedAt: Date.now(),
      }),
    )
    const pid = await f.t.run((ctx) =>
      ctx.db.insert("pieces", {
        requestId: otherRequestId,
        label: "X",
        status: "uploaded",
        required: true,
        storageKey: "k",
      }),
    )
    await expect(
      f.t.query(api.admin.requests.getPieceViewUrl, {
        token: f.yolandeToken,
        pieceId: pid,
      }),
    ).rejects.toThrowError(/périmètre/)
  })
})

describe("getDocumentPdfUrl", () => {
  test("renvoie null si pdfStorageKey absent (état v1)", async () => {
    const f = await buildFixture()
    const docId = await f.t.run((ctx) =>
      ctx.db.insert("documents", {
        actNumber: "EC-T-001",
        requestId: f.requestId,
        citizenId: f.citizenId,
        issuedByAgentId: f.patriceId,
        organismId: f.orgId,
        title: "Acte",
        status: "issued",
        issuedAt: Date.now(),
        sha256: "0".repeat(64),
        qualifiedTimestamp: "now",
        qrCode: "GC-T",
        payload: {},
      }),
    )
    const res = await f.t.query(api.admin.requests.getDocumentPdfUrl, {
      token: f.yolandeToken,
      documentId: docId,
    })
    expect(res).toBeNull()
  })

  test("citoyen : refuse l'accès au PDF d'un autre citoyen", async () => {
    const f = await buildFixture()
    const otherCitizen = await f.t.run((ctx) =>
      ctx.db.insert("citizens", {
        nip: "OTHER",
        idnSub: "idn-other",
        name: "Autre",
        identityVerified: true,
        createdAt: Date.now(),
      }),
    )
    void otherCitizen
    await expect(
      f.t
        .withIdentity({ subject: "idn-other" })
        .query(api.citizen.requests.getMyDocumentPdfUrl, {
          ref: f.ref, // ref de Marie
        }),
    ).rejects.toThrowError(/appartient pas/)
  })
})

// ====================================================================
// listMySignatures + countMyPending
// ====================================================================

describe("admin.signatures", () => {
  test("listMine renvoie les steps active assignés à moi", async () => {
    const f = await buildFixture()
    const { circuitId } = await f.t.mutation(
      api.admin.mutations.prepareDocument,
      {
        token: f.yolandeToken,
        ref: f.ref,
        chefServiceId: f.cyrilId,
        officierId: f.patriceId,
      },
    )
    void circuitId

    // Yolande (step 0) doit voir 1 signature en attente
    const pendingYolande = await f.t.query(api.admin.signatures.listMine, {
      token: f.yolandeToken,
      scope: "pending",
    })
    expect(pendingYolande).toHaveLength(1)
    expect(pendingYolande[0].stepOrder).toBe(0)
    expect(pendingYolande[0].stepsTotal).toBe(3)
    expect(pendingYolande[0].document.actNumber).toMatch(/^EC-LBV-/)
    expect(pendingYolande[0].request.ref).toBe(f.ref)

    // Cyril (step 1, pending) ne voit rien encore
    const pendingCyril = await f.t.query(api.admin.signatures.listMine, {
      token: f.cyrilToken,
      scope: "pending",
    })
    expect(pendingCyril).toHaveLength(0)
  })

  test("listMine scope=recent renvoie les décisions passées", async () => {
    const f = await buildFixture()
    const { circuitId } = await f.t.mutation(
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

    const recent = await f.t.query(api.admin.signatures.listMine, {
      token: f.yolandeToken,
      scope: "recent",
    })
    expect(recent).toHaveLength(1)
    expect(recent[0].stepStatus).toBe("done")
    expect(recent[0].decidedAt).toBeGreaterThan(0)
  })

  test("countMyPending renvoie le bon nombre", async () => {
    const f = await buildFixture()
    expect(
      await f.t.query(api.admin.signatures.countMyPending, {
        token: f.yolandeToken,
      }),
    ).toBe(0)

    await f.t.mutation(api.admin.mutations.prepareDocument, {
      token: f.yolandeToken,
      ref: f.ref,
      chefServiceId: f.cyrilId,
      officierId: f.patriceId,
    })
    expect(
      await f.t.query(api.admin.signatures.countMyPending, {
        token: f.yolandeToken,
      }),
    ).toBe(1)
  })

  test("filtre les circuits d'autres organismes (défensif)", async () => {
    const f = await buildFixture()
    // Crée un step assigné à Yolande mais sur un doc d'autre orga
    const otherRequestId = await f.t.run((ctx) =>
      ctx.db.insert("requests", {
        ref: "OTHER-3",
        citizenId: f.citizenId,
        serviceId: f.serviceId,
        organismId: f.otherOrgId,
        status: "to_sign",
        progressPct: 75,
        depositedAt: Date.now(),
      }),
    )
    const otherDocId = await f.t.run((ctx) =>
      ctx.db.insert("documents", {
        actNumber: "X-001",
        requestId: otherRequestId,
        citizenId: f.citizenId,
        issuedByAgentId: f.yolandeId,
        organismId: f.otherOrgId, // ← différent
        title: "X",
        status: "prepared",
        issuedAt: Date.now(),
        sha256: "0".repeat(64),
        qualifiedTimestamp: "now",
        qrCode: "GC-X",
        payload: {},
      }),
    )
    const otherCircuitId = await f.t.run((ctx) =>
      ctx.db.insert("signatureCircuits", {
        subjectKind: "document",
        subjectId: otherDocId,
        status: "active",
        startedAt: Date.now(),
      }),
    )
    await f.t.run((ctx) =>
      ctx.db.insert("signatureCircuitSteps", {
        circuitId: otherCircuitId,
        order: 0,
        assigneeAgentId: f.yolandeId,
        assigneeRoleSnapshot: "agent_instructeur",
        status: "active",
      }),
    )

    const pending = await f.t.query(api.admin.signatures.listMine, {
      token: f.yolandeToken,
      scope: "pending",
    })
    // Doit filtrer le step de l'autre organisme
    expect(pending).toHaveLength(0)
  })
})
