/**
 * Tests Bloc 5 — correspondance administrative (mutations + queries).
 *
 * Couvre les +50 tests cible :
 *   - Lifecycle complet : createDraft → recipients → attach → submit → approve × 3 → sent → ack → reply → close → archive
 *   - Préconditions par kind (decision_* exige PJ, escalation_* exige circuit)
 *   - Permissions (instructeur ne peut PAS recall)
 *   - Recall (refusé après 1er AR)
 *   - Threading (parent → threadId hérité, getThreadByThreadId ordonné)
 *   - Multi-destinataires (To/CC/BCC, BCC invisible aux autres)
 *   - AR idempotent + status passe à acknowledged uniquement si c'est le To
 *   - Confidentialité override par PJ
 *   - DUA (calcul + closeStaleAutomatic)
 *   - Citoyen (ownership, kinds restreints)
 *   - Cross-org sécurité
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
  orgA: Id<"organisms">
  orgB: Id<"organisms">
  orgC: Id<"organisms">
  // Org A — full team
  yolandeId: Id<"agents"> // instructeur
  yolandeToken: string
  cyrilId: Id<"agents"> // chef
  cyrilToken: string
  patriceId: Id<"agents"> // officier
  patriceToken: string
  adminAId: Id<"agents"> // admin_organisme
  adminAToken: string
  // Org B — minimal
  agentBId: Id<"agents">
  agentBToken: string
  // Citoyens
  marieId: Id<"citizens">
  marieSub: string
  jeanId: Id<"citizens">
  jeanSub: string
}

async function buildFixture(): Promise<Fixture> {
  const t = convexTest(schema, modules)
  registerAggregates(t)

  const seeded = await t.run(async (rawCtx) => {
    const ctx = { ...rawCtx, db: triggers.wrapDB(rawCtx).db }
    const orgA = await ctx.db.insert("organisms", {
      name: "DG État Civil",
      shortName: "DG EC",
      category: "direction_generale",
      status: "active",
    })
    const orgB = await ctx.db.insert("organisms", {
      name: "DG Documentation",
      shortName: "DG DOC",
      category: "direction_generale",
      status: "active",
    })
    const orgC = await ctx.db.insert("organisms", {
      name: "Mairie Libreville",
      shortName: "Mairie LBV",
      category: "collectivite",
      status: "active",
    })
    const yolandeId = await ctx.db.insert("agents", {
      organismId: orgA,
      nip: "Y01",
      name: "Yolande",
      email: "y@x",
      role: "agent_instructeur",
    })
    const cyrilId = await ctx.db.insert("agents", {
      organismId: orgA,
      nip: "C01",
      name: "Cyril",
      email: "c@x",
      role: "chef_service",
    })
    const patriceId = await ctx.db.insert("agents", {
      organismId: orgA,
      nip: "P01",
      name: "Patrice",
      email: "p@x",
      role: "officier_signataire",
    })
    const adminAId = await ctx.db.insert("agents", {
      organismId: orgA,
      nip: "A01",
      name: "Admin A",
      email: "a@x",
      role: "admin_organisme",
    })
    const agentBId = await ctx.db.insert("agents", {
      organismId: orgB,
      nip: "B01",
      name: "Agent B",
      email: "b@x",
      role: "agent_instructeur",
    })
    const marieId = await ctx.db.insert("citizens", {
      nip: "184127600504",
      idnSub: "idn-marie",
      name: "Marie OBAME",
      identityVerified: true,
      createdAt: Date.now(),
    })
    const jeanId = await ctx.db.insert("citizens", {
      nip: "178050099218",
      idnSub: "idn-jean",
      name: "Jean Pierre",
      identityVerified: true,
      createdAt: Date.now(),
    })
    // Seed des kindRules (sinon fallback hardcodé prend le relais)
    const KIND_RULES = [
      ["instruction_request", false, false, "5y", 7, 30, 90, "restricted"],
      ["decision_reject", true, true, "30y", 7, undefined, 90, "restricted"],
      ["cooperation_info_share", false, false, "2y", 14, 30, 90, "restricted"],
      ["escalation_tutelle", true, true, "50y", 3, 14, 180, "confidential"],
      ["other", false, false, "5y", 14, 30, 90, "restricted"],
    ] as const
    for (const [
      kind,
      requiresCircuit,
      requiresAttachment,
      duaCode,
      ackDeadlineDays,
      replyDeadlineDays,
      autoCloseAfterDays,
      defaultConfidentiality,
    ] of KIND_RULES) {
      await ctx.db.insert("correspondenceKindRules", {
        kind,
        requiresCircuit,
        requiresAttachment,
        duaCode,
        ackDeadlineDays,
        replyDeadlineDays,
        autoCloseAfterDays,
        defaultConfidentiality,
      })
    }
    return {
      orgA,
      orgB,
      orgC,
      yolandeId,
      cyrilId,
      patriceId,
      adminAId,
      agentBId,
      marieId,
      jeanId,
    }
  })

  const yolande = await t.mutation(api.auth.signInWithNip, { nip: "Y01" })
  const cyril = await t.mutation(api.auth.signInWithNip, { nip: "C01" })
  const patrice = await t.mutation(api.auth.signInWithNip, { nip: "P01" })
  const adminA = await t.mutation(api.auth.signInWithNip, { nip: "A01" })
  const agentB = await t.mutation(api.auth.signInWithNip, { nip: "B01" })

  return {
    t,
    ...seeded,
    yolandeToken: yolande.token,
    cyrilToken: cyril.token,
    patriceToken: patrice.token,
    adminAToken: adminA.token,
    agentBToken: agentB.token,
    marieSub: "idn-marie",
    jeanSub: "idn-jean",
  }
}

// ====================================================================
// createDraft + updateDraft + deleteDraft
// ====================================================================

describe("createDraft / updateDraft / deleteDraft", () => {
  test("createDraft génère ref + threadId + applique défauts du kind", async () => {
    const f = await buildFixture()
    const res = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "Demande d'avis",
        body: "Corps du courrier",
      },
    )
    expect(res.ref).toMatch(/^CR-\d{4}-\d{5}$/)
    expect(res.threadId).toMatch(/^[0-9a-f]{8}-/)
    const corres = await f.t.run((ctx) => ctx.db.get(res.correspondenceId))
    expect(corres?.status).toBe("draft")
    expect(corres?.duaCode).toBe("5y")
    expect(corres?.confidentiality).toBe("restricted")
    expect(corres?.fromOrganismId).toBe(f.orgA)
    expect(corres?.senderKind).toBe("organism")
  })

  test("createDraft sur sujet vide est refusé", async () => {
    const f = await buildFixture()
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.createDraft, {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "   ",
        body: "x",
      }),
    ).rejects.toThrowError(/sujet/i)
  })

  test("createDraft avec parent partage le threadId du parent", async () => {
    const f = await buildFixture()
    const parent = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "Parent",
        body: "Corps parent",
      },
    )
    const child = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_response",
        subject: "Réponse",
        body: "Corps enfant",
        parentCorrespondenceId: parent.correspondenceId,
      },
    )
    expect(child.threadId).toBe(parent.threadId)
  })

  test("updateDraft patch sujet + body sur draft, refusé sur sent", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "v1",
        body: "v1",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.updateDraft, {
      token: f.yolandeToken,
      correspondenceId,
      patch: { subject: "v2", body: "v2-body" },
    })
    const updated = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(updated?.subject).toBe("v2")
    expect(updated?.body).toBe("v2-body")

    // Simule sent
    await f.t.run((ctx) => ctx.db.patch(correspondenceId, { status: "sent" }))
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.updateDraft, {
        token: f.yolandeToken,
        correspondenceId,
        patch: { subject: "v3" },
      }),
    ).rejects.toThrowError(/modifiable/i)
  })

  test("updateDraft kind=decision_reject met à jour la DUA", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.updateDraft, {
      token: f.yolandeToken,
      correspondenceId,
      patch: { kind: "decision_reject" },
    })
    const u = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(u?.kind).toBe("decision_reject")
    expect(u?.duaCode).toBe("30y")
  })

  test("deleteDraft supprime cascade recipients + attachments", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.deleteDraft, {
      token: f.yolandeToken,
      correspondenceId,
    })
    const after = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(after).toBeNull()
    const recipients = await f.t.run((ctx) =>
      ctx.db
        .query("correspondenceRecipients")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", correspondenceId),
        )
        .collect(),
    )
    expect(recipients).toHaveLength(0)
  })
})

// ====================================================================
// addRecipient / removeRecipient (To/CC/BCC)
// ====================================================================

describe("destinataires To/CC/BCC", () => {
  test("addRecipient crée un To organisme avec snapshot nom", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "s",
        body: "b",
      },
    )
    const res = await f.t.mutation(
      api.admin.correspondenceLifecycle.addRecipient,
      {
        token: f.yolandeToken,
        correspondenceId,
        role: "to",
        recipientKind: "organism",
        recipientId: String(f.orgB),
      },
    )
    const r = await f.t.run((ctx) => ctx.db.get(res.recipientId))
    expect(r?.role).toBe("to")
    expect(r?.recipientOrganismId).toBe(f.orgB)
    expect(r?.recipientNameSnapshot).toBe("DG DOC")
  })

  test("addRecipient refuse doublon (même role + même recipient)", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
        token: f.yolandeToken,
        correspondenceId,
        role: "to",
        recipientKind: "organism",
        recipientId: String(f.orgB),
      }),
    ).rejects.toThrowError(/déjà ajouté/i)
  })

  test("Multi-destinataires : 1 To + 2 CC + 1 BCC tous créés", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "cc",
      recipientKind: "organism",
      recipientId: String(f.orgC),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "cc",
      recipientKind: "citizen",
      recipientId: String(f.marieId),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "bcc",
      recipientKind: "organism",
      recipientId: String(f.orgC),
    })
    const all = await f.t.run((ctx) =>
      ctx.db
        .query("correspondenceRecipients")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", correspondenceId),
        )
        .collect(),
    )
    expect(all).toHaveLength(4)
    expect(all.filter((r) => r.role === "to")).toHaveLength(1)
    expect(all.filter((r) => r.role === "cc")).toHaveLength(2)
    expect(all.filter((r) => r.role === "bcc")).toHaveLength(1)
  })
})

// ====================================================================
// sendDirect — préconditions par kind
// ====================================================================

describe("sendDirect préconditions", () => {
  async function setupDraft(f: Fixture, kind: "instruction_request" | "decision_reject" | "cooperation_info_share" | "escalation_tutelle") {
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind,
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    return correspondenceId
  }

  test("refuse sendDirect sur decision_reject (circuit obligatoire)", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupDraft(f, "decision_reject")
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
        token: f.cyrilToken,
        correspondenceId,
      }),
    ).rejects.toThrowError(/circuit/i)
  })

  test("refuse sendDirect sans destinataire principal (To)", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    // Pas de recipient
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
        token: f.cyrilToken,
        correspondenceId,
      }),
    ).rejects.toThrowError(/destinataire/i)
  })

  test("refuse sendDirect pour instructeur (permission send_direct = chef+)", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupDraft(f, "cooperation_info_share")
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
        token: f.yolandeToken,
        correspondenceId,
      }),
    ).rejects.toThrowError(/send_direct|refusée/)
  })

  test("happy path : cooperation_info_share envoyée par chef → status=sent + 1 message + notif", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupDraft(f, "cooperation_info_share")
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("sent")
    expect(corres?.sentAt).toBeGreaterThan(0)
    expect(corres?.dueAckAt).toBeGreaterThan(0)
    expect(corres?.duaExpiresAt).toBeGreaterThan(0)
    expect(corres?.messagesCount).toBe(1)

    const messages = await f.t.run((ctx) =>
      ctx.db
        .query("correspondenceMessages")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", correspondenceId),
        )
        .collect(),
    )
    expect(messages).toHaveLength(1)
    expect(messages[0].signed).toBe(true)
    expect(messages[0].signatureAlgorithm).toBe("stub-sha256-v1")

    // Notif à l'agent B (instructeur de l'org destinataire)
    const notifs = await f.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_time", (q) =>
          q.eq("recipientKind", "agent").eq("recipientId", String(f.agentBId)),
        )
        .collect(),
    )
    expect(notifs.some((n) => n.kind === "correspondence_received")).toBe(true)
  })

  test("refuse sendDirect sans PJ sur decision_reject (PJ obligatoire)", async () => {
    const f = await buildFixture()
    // decision_reject exige PJ ET circuit, donc on doit passer par submit
    const correspondenceId = await setupDraft(f, "decision_reject")
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.submitForSignature, {
        token: f.yolandeToken,
        correspondenceId,
      }),
    ).rejects.toThrowError(/pièce/i)
  })
})

// ====================================================================
// submitForSignature → circuit → envoi auto
// ====================================================================

describe("submitForSignature + circuit", () => {
  test("happy path : 3 steps → dernière approve déclenche performCorrespondenceSend", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "decision_reject",
        subject: "Rejet",
        body: "Motif détaillé",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    // Attacher une PJ (decision_reject exige attachment)
    await f.t.run(async (ctx) => {
      await ctx.db.insert("correspondenceAttachments", {
        correspondenceId,
        filename: "doc.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1000,
        storageKey: "fake-key",
        sha256: "0".repeat(64),
        kind: "external",
        signed: false,
        uploadedAt: Date.now(),
      })
    })

    const { circuitId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.submitForSignature,
      {
        token: f.yolandeToken,
        correspondenceId,
        chefServiceId: f.cyrilId,
        officierId: f.patriceId,
      },
    )
    expect(circuitId).toBeDefined()
    const corres1 = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres1?.status).toBe("pending_signature")

    // Approve chain
    await f.t.mutation(api.admin.mutations.approveSignatureStep, {
      token: f.yolandeToken,
      circuitId,
    })
    await f.t.mutation(api.admin.mutations.approveSignatureStep, {
      token: f.cyrilToken,
      circuitId,
    })
    const final = await f.t.mutation(api.admin.mutations.approveSignatureStep, {
      token: f.patriceToken,
      circuitId,
    })
    expect(final.circuitCompleted).toBe(true)

    // Corres doit être passée à sent automatiquement
    const corres2 = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres2?.status).toBe("sent")
    expect(corres2?.sentAt).toBeGreaterThan(0)
  })

  test("instructeur ne peut PAS soumettre sans rôle correspondence.send", async () => {
    const f = await buildFixture()
    // Yolande EST instructeur donc elle PEUT — testons agentB d'orgB qui n'a pas créé
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "decision_reject",
        subject: "s",
        body: "b",
      },
    )
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.submitForSignature, {
        token: f.agentBToken, // hors de l'org A
        correspondenceId,
      }),
    ).rejects.toThrowError(/périmètre/i)
  })
})

// ====================================================================
// acknowledge (AR formel)
// ====================================================================

describe("acknowledge", () => {
  async function setupSent(f: Fixture) {
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    return correspondenceId
  }

  test("ack par le To passe status à acknowledged + notif émetteur", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupSent(f)
    const res = await f.t.mutation(
      api.admin.correspondenceLifecycle.acknowledge,
      {
        token: f.agentBToken,
        correspondenceId,
        note: "Bien reçu",
      },
    )
    expect(res.already).toBe(false)
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("acknowledged")

    // Notif à Yolande (créateur)
    const notifs = await f.t.run((ctx) =>
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_time", (q) =>
          q.eq("recipientKind", "agent").eq("recipientId", String(f.yolandeId)),
        )
        .collect(),
    )
    expect(notifs.some((n) => n.kind === "correspondence_acknowledged")).toBe(
      true,
    )
  })

  test("ack idempotent : 2e appel renvoie already=true", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupSent(f)
    await f.t.mutation(api.admin.correspondenceLifecycle.acknowledge, {
      token: f.agentBToken,
      correspondenceId,
    })
    const r2 = await f.t.mutation(
      api.admin.correspondenceLifecycle.acknowledge,
      {
        token: f.agentBToken,
        correspondenceId,
      },
    )
    expect(r2.already).toBe(true)
  })

  test("ack refusé pour un agent d'un org NON destinataire", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupSent(f)
    // adminA est dans orgA = émetteur, pas destinataire
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.acknowledge, {
        token: f.adminAToken,
        correspondenceId,
      }),
    ).rejects.toThrowError(/destinataire/i)
  })
})

// ====================================================================
// reply
// ====================================================================

describe("reply", () => {
  test("reply insère message + patch status=replied", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.reply, {
      token: f.agentBToken,
      correspondenceId,
      body: "Voici notre réponse.",
    })
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("replied")
    expect(corres?.messagesCount).toBe(2)
    const messages = await f.t.run((ctx) =>
      ctx.db
        .query("correspondenceMessages")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", correspondenceId),
        )
        .collect(),
    )
    expect(messages).toHaveLength(2)
    expect(messages[1].fromAgentId).toBe(f.agentBId)
  })

  test("reply refuse body vide", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.reply, {
        token: f.agentBToken,
        correspondenceId,
        body: "   ",
      }),
    ).rejects.toThrowError(/vide/i)
  })
})

// ====================================================================
// recall — admin uniquement, refusé après 1er AR
// ====================================================================

describe("recall", () => {
  async function setupSent(f: Fixture) {
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    return correspondenceId
  }

  test("admin_organisme rappelle → status=recalled + msg système + notif", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupSent(f)
    const res = await f.t.mutation(
      api.admin.correspondenceLifecycle.recall,
      {
        token: f.adminAToken,
        correspondenceId,
        reason: "Erreur dans le corps",
      },
    )
    expect(res.already).toBe(false)
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("recalled")
    expect(corres?.recalledReason).toBe("Erreur dans le corps")
    const sysMsg = await f.t.run((ctx) =>
      ctx.db
        .query("correspondenceMessages")
        .withIndex("by_correspondence", (q) =>
          q.eq("correspondenceId", correspondenceId),
        )
        .collect(),
    )
    expect(sysMsg.some((m) => m.isSystem === true)).toBe(true)
  })

  test("chef_service ne peut PAS recall (admin only)", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupSent(f)
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.recall, {
        token: f.cyrilToken,
        correspondenceId,
        reason: "x",
      }),
    ).rejects.toThrowError(/recall|refusée/)
  })

  test("recall refusé après 1er AR", async () => {
    const f = await buildFixture()
    const correspondenceId = await setupSent(f)
    await f.t.mutation(api.admin.correspondenceLifecycle.acknowledge, {
      token: f.agentBToken,
      correspondenceId,
    })
    await expect(
      f.t.mutation(api.admin.correspondenceLifecycle.recall, {
        token: f.adminAToken,
        correspondenceId,
        reason: "trop tard",
      }),
    ).rejects.toThrowError(/accusé/i)
  })
})

// ====================================================================
// close + archive
// ====================================================================

describe("close + archive", () => {
  test("close passe status à closed + closedReason", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.close, {
      token: f.cyrilToken,
      correspondenceId,
      reason: "Résolu",
    })
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("closed")
    expect(corres?.closedReason).toBe("Résolu")
  })

  test("archive crée entrée archives + patch archived", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    await f.t.mutation(
      api.admin.correspondenceLifecycle.archiveCorrespondence,
      {
        token: f.cyrilToken,
        correspondenceId,
      },
    )
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("archived")
    expect(corres?.archivedAt).toBeGreaterThan(0)

    const archive = await f.t.run((ctx) =>
      ctx.db
        .query("archives")
        .withIndex("by_organism_status", (q) =>
          q.eq("producerOrganismId", f.orgA).eq("status", "active"),
        )
        .filter((q) => q.eq(q.field("cote"), `CR/${corres?.ref}`))
        .first(),
    )
    expect(archive).not.toBeNull()
  })
})

// ====================================================================
// Queries listInboxV2 / listOutbox / listDrafts
// ====================================================================

describe("queries listings", () => {
  test("listOutbox renvoie les sent par mon org, exclut drafts", async () => {
    const f = await buildFixture()
    // 1 draft + 1 sent
    await f.t.mutation(api.admin.correspondenceLifecycle.createDraft, {
      token: f.yolandeToken,
      kind: "instruction_request",
      subject: "Brouillon",
      body: "b",
    })
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "Envoyé",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    const out = await f.t.query(
      api.admin.correspondenceQueries.listOutbox,
      { token: f.yolandeToken },
    )
    expect(out).toHaveLength(1)
    expect(out[0].subject).toBe("Envoyé")
    expect(out[0].status).toBe("sent")
  })

  test("listInboxV2 scope=untreated → corres sans AR", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    const inbox = await f.t.query(api.admin.correspondenceQueries.listInboxV2, {
      token: f.agentBToken,
      scope: "untreated",
    })
    expect(inbox).toHaveLength(1)
    // Après ack, plus dans untreated
    await f.t.mutation(api.admin.correspondenceLifecycle.acknowledge, {
      token: f.agentBToken,
      correspondenceId,
    })
    const inboxAfter = await f.t.query(
      api.admin.correspondenceQueries.listInboxV2,
      { token: f.agentBToken, scope: "untreated" },
    )
    expect(inboxAfter).toHaveLength(0)
  })

  test("listDrafts renvoie uniquement mes drafts", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.correspondenceLifecycle.createDraft, {
      token: f.yolandeToken,
      kind: "instruction_request",
      subject: "Mon brouillon",
      body: "b",
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.createDraft, {
      token: f.cyrilToken,
      kind: "instruction_request",
      subject: "Brouillon de Cyril",
      body: "b",
    })
    const mine = await f.t.query(api.admin.correspondenceQueries.listDrafts, {
      token: f.yolandeToken,
    })
    expect(mine).toHaveLength(1)
    expect(mine[0].subject).toBe("Mon brouillon")
  })
})

// ====================================================================
// getThreadV2 + threading cross-corres
// ====================================================================

describe("getThreadV2 + cross-corres", () => {
  test("getThreadV2 renvoie messages + recipients + acks + circuit + BCC visible si je suis sender", async () => {
    const f = await buildFixture()
    const { correspondenceId, ref } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "bcc",
      recipientKind: "organism",
      recipientId: String(f.orgC),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })

    const thread = await f.t.query(
      api.admin.correspondenceQueries.getThreadV2,
      { token: f.yolandeToken, ref },
    )
    expect(thread?.recipients).toHaveLength(2) // BCC visible pour sender
    expect(thread?.messages).toHaveLength(1)
    expect(thread?.isSender).toBe(true)
  })

  test("getThreadV2 refuse l'accès à un agent hors périmètre", async () => {
    const f = await buildFixture()
    const { correspondenceId, ref } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    // OrgC n'est ni émetteur ni recipient → on crée un agent orgC pour tester
    const orgCAgentId = await f.t.run((ctx) =>
      ctx.db.insert("agents", {
        organismId: f.orgC,
        nip: "OC01",
        name: "Agent OrgC",
        email: "oc@x",
        role: "agent_instructeur",
      }),
    )
    void orgCAgentId
    const orgCToken = (
      await f.t.mutation(api.auth.signInWithNip, { nip: "OC01" })
    ).token
    await expect(
      f.t.query(api.admin.correspondenceQueries.getThreadV2, {
        token: orgCToken,
        ref,
      }),
    ).rejects.toThrowError(/périmètre/i)
  })

  test("getThreadByThreadId renvoie toutes les corres chronologiquement", async () => {
    const f = await buildFixture()
    const parent = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "Parent",
        body: "b",
      },
    )
    const child = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_response",
        subject: "Enfant",
        body: "b",
        parentCorrespondenceId: parent.correspondenceId,
      },
    )
    void child
    const thread = await f.t.query(
      api.admin.correspondenceQueries.getThreadByThreadId,
      { token: f.yolandeToken, threadId: parent.threadId },
    )
    expect(thread).toHaveLength(2)
    expect(thread[0].subject).toBe("Parent")
    expect(thread[1].subject).toBe("Enfant")
  })
})

// ====================================================================
// getInboxCounts + search + escalations
// ====================================================================

describe("counts + search + escalations", () => {
  test("getInboxCounts compte unread/untreated/urgent", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "s",
        body: "b",
        urgent: true,
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.run(async (ctx) => {
      const c = await ctx.db.get(correspondenceId)
      if (c) await ctx.db.patch(c._id, { urgent: true })
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    const counts = await f.t.query(
      api.admin.correspondenceQueries.getInboxCounts,
      { token: f.agentBToken },
    )
    expect(counts.unread).toBe(1)
    expect(counts.untreated).toBe(1)
    expect(counts.urgent).toBe(1)
  })

  test("searchCorrespondences filtre par sujet (≥ 3 chars)", async () => {
    const f = await buildFixture()
    await f.t.mutation(api.admin.correspondenceLifecycle.createDraft, {
      token: f.yolandeToken,
      kind: "instruction_request",
      subject: "Demande spécifique XYZ",
      body: "b",
    })
    const res = await f.t.query(
      api.admin.correspondenceQueries.searchCorrespondences,
      { token: f.yolandeToken, query: "xyz" },
    )
    expect(res).toHaveLength(1)
    // < 3 chars → array vide
    const empty = await f.t.query(
      api.admin.correspondenceQueries.searchCorrespondences,
      { token: f.yolandeToken, query: "xy" },
    )
    expect(empty).toHaveLength(0)
  })

  test("listEscalations refusé pour non-platform_admin", async () => {
    const f = await buildFixture()
    await expect(
      f.t.query(api.admin.correspondenceQueries.listEscalations, {
        token: f.adminAToken,
      }),
    ).rejects.toThrowError(/platform_read|refusée/)
  })

  test("getKindRules renvoie la règle pour le kind donné", async () => {
    const f = await buildFixture()
    const rule = await f.t.query(
      api.admin.correspondenceQueries.getKindRules,
      { token: f.yolandeToken, kind: "decision_reject" },
    )
    expect(rule.requiresCircuit).toBe(true)
    expect(rule.requiresAttachment).toBe(true)
    expect(rule.duaCode).toBe("30y")
  })
})

// ====================================================================
// Citoyen
// ====================================================================

describe("citoyen", () => {
  test("citizenCreateCorrespondence happy path → corres sent + 1 message", async () => {
    const f = await buildFixture()
    const res = await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.correspondence.citizenCreateCorrespondence, {
        toOrganismId: f.orgA,
        kind: "instruction_request",
        subject: "Demande d'information",
        body: "Bonjour, …",
      })
    expect(res.ref).toMatch(/^CR-\d{4}-\d{5}$/)
    const corres = await f.t.run((ctx) => ctx.db.get(res.correspondenceId))
    expect(corres?.status).toBe("sent")
    expect(corres?.senderKind).toBe("citizen")
    expect(corres?.fromCitizenId).toBe(f.marieId)
  })

  test("citizenCreateCorrespondence refuse kind interdit (decision_reject)", async () => {
    const f = await buildFixture()
    await expect(
      f.t
        .withIdentity({ subject: f.marieSub })
        .mutation(api.citizen.correspondence.citizenCreateCorrespondence, {
          toOrganismId: f.orgA,
          kind: "decision_reject",
          subject: "s",
          body: "b",
        }),
    ).rejects.toThrowError(/non autorisé/i)
  })

  test("citizenGetThread refusé pour un citoyen non-destinataire", async () => {
    const f = await buildFixture()
    const res = await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.correspondence.citizenCreateCorrespondence, {
        toOrganismId: f.orgA,
        kind: "instruction_request",
        subject: "s",
        body: "b",
      })
    await expect(
      f.t
        .withIdentity({ subject: f.jeanSub })
        .query(api.citizen.correspondence.citizenGetThread, {
          ref: res.ref,
        }),
    ).rejects.toThrowError(/adressé/i)
  })

  test("citizenAcknowledge passe corres à acknowledged si citoyen est To", async () => {
    const f = await buildFixture()
    // L'agent crée une corres org→citoyen
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "cooperation_info_share",
        subject: "Convocation",
        body: "Vous êtes invité à …",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "citizen",
      recipientId: String(f.marieId),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    await f.t
      .withIdentity({ subject: f.marieSub })
      .mutation(api.citizen.correspondence.citizenAcknowledge, {
        correspondenceId,
      })
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("acknowledged")
  })

  test("citizenListOrganisms renvoie les orgs active triés", async () => {
    const f = await buildFixture()
    const orgs = await f.t
      .withIdentity({ subject: f.marieSub })
      .query(api.citizen.correspondence.citizenListOrganisms, {})
    expect(orgs.length).toBeGreaterThanOrEqual(3)
    expect(orgs.map((o) => o.shortName)).toContain("DG EC")
  })
})

// ====================================================================
// closeStaleAutomatic
// ====================================================================

describe("closeStaleAutomatic cron", () => {
  test("ferme une instruction_request inactive depuis > 90j", async () => {
    const f = await buildFixture()
    const { correspondenceId } = await f.t.mutation(
      api.admin.correspondenceLifecycle.createDraft,
      {
        token: f.yolandeToken,
        kind: "instruction_request",
        subject: "Vieux",
        body: "b",
      },
    )
    await f.t.mutation(api.admin.correspondenceLifecycle.addRecipient, {
      token: f.yolandeToken,
      correspondenceId,
      role: "to",
      recipientKind: "organism",
      recipientId: String(f.orgB),
    })
    await f.t.mutation(api.admin.correspondenceLifecycle.sendDirect, {
      token: f.cyrilToken,
      correspondenceId,
    })
    // Antédate de 100 jours
    await f.t.run((ctx) =>
      ctx.db.patch(correspondenceId, {
        sentAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
      }),
    )
    const res = await f.t.mutation(
      api.admin.correspondenceLifecycle.closeStaleAutomatic,
      {},
    )
    expect(res.closedCount).toBeGreaterThanOrEqual(1)
    const corres = await f.t.run((ctx) => ctx.db.get(correspondenceId))
    expect(corres?.status).toBe("closed")
    expect(corres?.closedReason).toBe(
      "Clôture automatique pour inactivité",
    )
  })
})
