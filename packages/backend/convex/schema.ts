import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

/**
 * Schema Gabon Connect — itération 1 : back-office admin
 *
 * Périmètre couvert : agents, organismes, citoyens, services, demandes, pièces,
 * vérifications, correspondance, archives SAE, sessions auth NIP.
 *
 * Les apps citizen-web et platform-web restent sur les mocks pour cette itération.
 */
export default defineSchema({
  // ───────────────────────────────────────────────────────────
  // Identité & organismes
  // ───────────────────────────────────────────────────────────

  organisms: defineTable({
    name: v.string(),
    shortName: v.optional(v.string()),
    category: v.union(
      v.literal("ministere"),
      v.literal("direction_generale"),
      v.literal("etablissement_public"),
      v.literal("collectivite"),
      v.literal("autorite"),
      v.literal("institution"),
    ),
    tutelage: v.optional(v.string()),
    province: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("onboarding"),
      v.literal("suspended"),
    ),
    connection: v.optional(v.string()), // "API + SSO" | "Portail" | "—"
    signedAt: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_category", ["category"]),

  // Agents : utilisateurs des organismes (back-office admin)
  agents: defineTable({
    organismId: v.id("organisms"),
    nip: v.string(), // sert d'identifiant d'authentification (faux IdP)
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("agent_instructeur"),
      v.literal("chef_service"),
      v.literal("officier_signataire"),
      v.literal("admin_organisme"),
      v.literal("admin_technique"),
    ),
  })
    .index("by_nip", ["nip"])
    .index("by_organism", ["organismId"])
    .index("by_email", ["email"]),

  // Citoyens
  citizens: defineTable({
    nip: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    birthDate: v.optional(v.string()),
    birthPlace: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    motherName: v.optional(v.string()),
    sex: v.optional(v.union(v.literal("M"), v.literal("F"))),
    identityVerified: v.boolean(),
    createdAt: v.number(),
  }).index("by_nip", ["nip"]),

  // ───────────────────────────────────────────────────────────
  // Catalogue de services
  // ───────────────────────────────────────────────────────────

  services: defineTable({
    organismId: v.id("organisms"),
    slug: v.string(), // "acte-naissance", "passeport", etc.
    title: v.string(),
    variant: v.optional(v.string()), // "copie intégrale", "extrait", ...
    category: v.string(),
    fee: v.string(), // "Gratuit", "5 000 FCFA"
    delayHours: v.number(),
    status: v.union(
      v.literal("published"),
      v.literal("draft"),
      v.literal("archived"),
    ),
    satisfaction: v.optional(v.number()), // 0..5
  })
    .index("by_slug", ["slug"])
    .index("by_organism_status", ["organismId", "status"]),

  // ───────────────────────────────────────────────────────────
  // Demandes citoyennes & instruction
  // ───────────────────────────────────────────────────────────

  requests: defineTable({
    ref: v.string(), // GC-2026-EC-002841
    citizenId: v.id("citizens"),
    serviceId: v.id("services"),
    organismId: v.id("organisms"),
    assignedAgentId: v.optional(v.id("agents")),
    status: v.union(
      v.literal("submitted"),
      v.literal("in_instruction"),
      v.literal("waiting_pieces"),
      v.literal("waiting_registry"),
      v.literal("to_sign"),
      v.literal("issued"),
      v.literal("rejected"),
      v.literal("cancelled"),
    ),
    progressPct: v.number(),
    depositedAt: v.number(),
    dueAt: v.optional(v.number()),
    issuedAt: v.optional(v.number()),
    payload: v.optional(v.any()), // données saisies au dépôt
    internalNote: v.optional(v.string()),
  })
    .index("by_ref", ["ref"])
    .index("by_organism_status", ["organismId", "status"])
    .index("by_citizen", ["citizenId"])
    .index("by_assigned_agent", ["assignedAgentId"]),

  pieces: defineTable({
    requestId: v.id("requests"),
    label: v.string(),
    filename: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    status: v.union(
      v.literal("missing"),
      v.literal("uploaded"),
      v.literal("validated"),
      v.literal("rejected"),
    ),
    ocrConfidence: v.optional(v.number()),
    required: v.boolean(),
  }).index("by_request", ["requestId"]),

  verifications: defineTable({
    requestId: v.id("requests"),
    title: v.string(),
    status: v.union(v.literal("ok"), v.literal("pending"), v.literal("ko")),
    description: v.string(),
    order: v.number(),
  }).index("by_request", ["requestId"]),

  // Événements du timeline d'une demande (suivi citoyen + activité admin)
  requestEvents: defineTable({
    requestId: v.id("requests"),
    title: v.string(),
    description: v.optional(v.string()),
    actor: v.optional(v.string()), // "Système", "Vous", nom d'agent, organisme
    occurredAt: v.number(),
    kind: v.union(
      v.literal("submission"),
      v.literal("seal"),
      v.literal("assignment"),
      v.literal("verification"),
      v.literal("piece_request"),
      v.literal("piece_received"),
      v.literal("transfer"),
      v.literal("signature"),
      v.literal("delivery"),
      v.literal("message"),
    ),
  }).index("by_request_time", ["requestId", "occurredAt"]),

  // ───────────────────────────────────────────────────────────
  // Actes générés (documents émis avec valeur probante)
  // ───────────────────────────────────────────────────────────

  documents: defineTable({
    actNumber: v.string(), // EC-LBV-2026-04812
    requestId: v.id("requests"),
    citizenId: v.id("citizens"),
    issuedByAgentId: v.id("agents"),
    organismId: v.id("organisms"),
    title: v.string(),
    issuedAt: v.number(),
    sha256: v.string(),
    qualifiedTimestamp: v.string(),
    qrCode: v.string(),
    payload: v.any(), // données qui composent l'acte (variables remplies)
  })
    .index("by_act_number", ["actNumber"])
    .index("by_citizen", ["citizenId"])
    .index("by_request", ["requestId"]),

  // ───────────────────────────────────────────────────────────
  // Correspondance inter-administrations (A6)
  // ───────────────────────────────────────────────────────────

  correspondences: defineTable({
    ref: v.string(), // CR-2026-1842
    fromOrganismId: v.id("organisms"),
    toOrganismId: v.id("organisms"),
    subject: v.string(),
    body: v.string(),
    urgent: v.boolean(),
    confidentiality: v.union(
      v.literal("public"),
      v.literal("restricted"),
      v.literal("confidential"),
    ),
    archivePolicy: v.string(), // "2 ans", "Indéf.", etc.
    sentAt: v.number(),
    dueAt: v.optional(v.number()),
    linkedCitizenId: v.optional(v.id("citizens")),
    linkedRequestId: v.optional(v.id("requests")),
  })
    .index("by_ref", ["ref"])
    .index("by_to_organism", ["toOrganismId"])
    .index("by_from_organism", ["fromOrganismId"]),

  correspondenceMessages: defineTable({
    correspondenceId: v.id("correspondences"),
    fromAgentId: v.id("agents"),
    body: v.string(),
    signed: v.boolean(), // S/MIME
    sentAt: v.number(),
  }).index("by_correspondence", ["correspondenceId"]),

  correspondenceReads: defineTable({
    correspondenceId: v.id("correspondences"),
    agentId: v.id("agents"),
    readAt: v.number(),
  })
    .index("by_correspondence_agent", ["correspondenceId", "agentId"])
    .index("by_agent", ["agentId"]),

  // ───────────────────────────────────────────────────────────
  // Archives à valeur probante (SAE — A7)
  // ───────────────────────────────────────────────────────────

  archives: defineTable({
    cote: v.string(), // GA/EC/2026/04812
    description: v.string(),
    producerOrganismId: v.id("organisms"),
    versedAt: v.number(),
    dua: v.string(), // durée d'utilité administrative — "Indéf.", "75 ans", "3 mois"
    status: v.union(
      v.literal("active"),
      v.literal("semi_active"),
      v.literal("inactive"),
      v.literal("archived_final"),
      v.literal("scheduled_destruction"),
      v.literal("destroyed"),
    ),
    finalSort: v.string(),
    sha256: v.string(),
    linkedDocumentId: v.optional(v.id("documents")),
    linkedRequestId: v.optional(v.id("requests")),
  })
    .index("by_cote", ["cote"])
    .index("by_organism_status", ["producerOrganismId", "status"]),

  // ───────────────────────────────────────────────────────────
  // Auth : sessions NIP simulées
  // ───────────────────────────────────────────────────────────

  authSessions: defineTable({
    token: v.string(),
    agentId: v.id("agents"),
    issuedAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_agent", ["agentId"]),
})
