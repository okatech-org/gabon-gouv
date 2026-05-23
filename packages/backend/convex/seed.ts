import { mutation, type MutationCtx } from "./_generated/server"
import type { Id } from "./_generated/dataModel"

/**
 * Seed idempotent — recharge les données de base. À appeler une fois pour
 * remplir Convex après le premier `convex dev`.
 *
 * Côté admin-web on s'attend à pouvoir se connecter avec :
 *  - Yolande NGUEMA      (DG État Civil, agent_instructeur)        NIP 198501100001
 *  - Cyril NDONG         (DG État Civil, chef_service)             NIP 197603100002
 *  - Patrice MOUSSAVOU   (DG État Civil, officier_signataire)     NIP 196812100003
 *  - Faustin MBOUMBA     (DG Documentation, admin_organisme)       NIP 197004100004
 */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    // Vider les tables (idempotence) — l'ordre respecte les dépendances inverses.
    const tables = [
      "authSessions",
      "correspondenceReads",
      "correspondenceMessages",
      "correspondences",
      "archives",
      "documents",
      "requestEvents",
      "verifications",
      "pieces",
      "requests",
      "services",
      "citizens",
      "agents",
      "organisms",
    ] as const
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect()
      for (const r of rows) {
        await ctx.db.delete(r._id)
      }
    }

    // ────────── Organismes ──────────
    const dgEtatCivil = await ctx.db.insert("organisms", {
      name: "Direction Gén. de l'État Civil",
      shortName: "DG État Civil",
      category: "direction_generale",
      tutelage: "Min. Intérieur",
      province: "Estuaire",
      status: "active",
      connection: "API + SSO",
      signedAt: "03/2024",
    })

    const dgDocumentation = await ctx.db.insert("organisms", {
      name: "Direction Gén. de la Documentation",
      shortName: "DG Documentation",
      category: "direction_generale",
      tutelage: "Min. Intérieur",
      province: "Estuaire",
      status: "active",
      connection: "API + SSO",
      signedAt: "03/2024",
    })

    const minJustice = await ctx.db.insert("organisms", {
      name: "Ministère de la Justice",
      shortName: "Min. Justice",
      category: "ministere",
      tutelage: "Présidence",
      province: "Estuaire",
      status: "active",
      connection: "API + SSO",
      signedAt: "04/2024",
    })

    const anpi = await ctx.db.insert("organisms", {
      name: "ANPI-Gabon",
      category: "etablissement_public",
      tutelage: "Min. Économie",
      province: "Estuaire",
      status: "active",
      connection: "API + SSO",
      signedAt: "05/2024",
    })

    const dgi = await ctx.db.insert("organisms", {
      name: "Direction Gén. des Impôts",
      shortName: "DGI",
      category: "direction_generale",
      tutelage: "Min. Économie",
      province: "Estuaire",
      status: "active",
      connection: "API + SSO",
      signedAt: "04/2024",
    })

    const cnamgs = await ctx.db.insert("organisms", {
      name: "CNAMGS",
      category: "etablissement_public",
      tutelage: "Min. Santé",
      province: "Estuaire",
      status: "active",
      connection: "API + SSO",
      signedAt: "06/2024",
    })

    const mairieLbv = await ctx.db.insert("organisms", {
      name: "Mairie de Libreville",
      category: "collectivite",
      tutelage: "Autonome",
      province: "Estuaire",
      status: "active",
      connection: "Portail",
      signedAt: "01/2025",
    })

    // ────────── Agents (DG État Civil) ──────────
    const yolande = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "198501100001",
      name: "Yolande NGUEMA",
      email: "y.nguema@etatcivil.gouv.ga",
      role: "agent_instructeur",
    })

    const cyril = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "197603100002",
      name: "Cyril NDONG",
      email: "c.ndong@etatcivil.gouv.ga",
      role: "chef_service",
    })

    const patrice = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "196812100003",
      name: "Patrice MOUSSAVOU",
      email: "p.moussavou@etatcivil.gouv.ga",
      role: "officier_signataire",
    })

    const louis = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "198909100004",
      name: "Louis EYEGHE",
      email: "l.eyeghe@etatcivil.gouv.ga",
      role: "agent_instructeur",
    })

    // Agent autre organisme — pour la correspondance inter-admin
    const faustin = await ctx.db.insert("agents", {
      organismId: dgDocumentation,
      nip: "197004100004",
      name: "Faustin MBOUMBA",
      email: "f.mboumba@documentation.gouv.ga",
      role: "admin_organisme",
    })

    // ────────── Citoyens (échantillon) ──────────
    const now = Date.now()

    const marie = await ctx.db.insert("citizens", {
      nip: "184127600504",
      name: "Marie Estelle OBAME",
      email: "marie.obame@id.gouv.ga",
      phone: "+241 06 24 18 33",
      address: "BP 8112, Akanda",
      birthDate: "14 mars 1992",
      birthPlace: "Libreville, Estuaire",
      fatherName: "OBAME Jean-Pierre",
      motherName: "MBOUMBA Antoinette",
      sex: "F",
      identityVerified: true,
      createdAt: now - 1000 * 60 * 60 * 24 * 365 * 2.5,
    })

    const jpMoung = await ctx.db.insert("citizens", {
      nip: "178050099218",
      name: "Jean-Pierre MOUNGUENGUI",
      email: "jp.mounguenguie@id.gouv.ga",
      phone: "+241 06 78 22 14",
      address: "Quartier Glass, Libreville",
      birthDate: "5 mai 1978",
      birthPlace: "Port-Gentil",
      sex: "M",
      identityVerified: true,
      createdAt: now - 1000 * 60 * 60 * 24 * 200,
    })

    const aicha = await ctx.db.insert("citizens", {
      nip: "191041100712",
      name: "Aïcha BONGO",
      email: "a.bongo@id.gouv.ga",
      birthDate: "11 avril 1991",
      birthPlace: "Libreville",
      sex: "F",
      identityVerified: true,
      createdAt: now - 1000 * 60 * 60 * 24 * 150,
    })

    const paulOndo = await ctx.db.insert("citizens", {
      nip: "188090677341",
      name: "Paul ONDO",
      email: "p.ondo@id.gouv.ga",
      birthDate: "6 septembre 1988",
      birthPlace: "Oyem",
      sex: "M",
      identityVerified: true,
      createdAt: now - 1000 * 60 * 60 * 24 * 120,
    })

    const nzoghe = await ctx.db.insert("citizens", {
      nip: "174030042519",
      name: "Famille NZOGHE",
      birthDate: "3 mars 1974",
      birthPlace: "Lambaréné",
      identityVerified: true,
      createdAt: now - 1000 * 60 * 60 * 24 * 90,
    })

    // ────────── Services (DG État Civil) ──────────
    const svcActeCopie = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      slug: "acte-naissance",
      title: "Acte de naissance",
      variant: "copie intégrale",
      category: "État civil",
      fee: "Gratuit",
      delayHours: 48,
      status: "published",
      satisfaction: 4.7,
    })

    const svcActeExtrait = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      slug: "acte-naissance-extrait",
      title: "Acte de naissance",
      variant: "extrait",
      category: "État civil",
      fee: "Gratuit",
      delayHours: 36,
      status: "published",
      satisfaction: 4.7,
    })

    const svcMariage = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      slug: "acte-mariage",
      title: "Acte de mariage",
      category: "État civil",
      fee: "Gratuit",
      delayHours: 48,
      status: "published",
      satisfaction: 4.6,
    })

    const svcNationalite = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      slug: "certificat-nationalite",
      title: "Certificat de nationalité",
      category: "État civil",
      fee: "3 000 FCFA",
      delayHours: 144,
      status: "published",
      satisfaction: 4.2,
    })

    const svcDeces = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      slug: "acte-deces",
      title: "Acte de décès",
      category: "État civil",
      fee: "Gratuit",
      delayHours: 32,
      status: "published",
      satisfaction: 4.5,
    })

    // ────────── Demandes (échantillon admin) ──────────
    const day = 1000 * 60 * 60 * 24

    const r1 = await insertRequest(ctx, {
      ref: "GC-2026-EC-002841",
      citizenId: marie,
      serviceId: svcActeCopie,
      organismId: dgEtatCivil,
      assignedAgentId: yolande,
      status: "in_instruction",
      progressPct: 60,
      depositedAt: now - 14 * 60 * 60 * 1000,
      dueAt: now + day,
      payload: { copies: 2, variant: "copie intégrale" },
      internalNote:
        "Registre LBV confirmé visuellement le 21/05. Pas de mentions marginales. Demande standard, traitement nominal.",
    })

    const r2 = await insertRequest(ctx, {
      ref: "GC-2026-EC-002836",
      citizenId: jpMoung,
      serviceId: svcMariage,
      organismId: dgEtatCivil,
      assignedAgentId: yolande,
      status: "waiting_registry",
      progressPct: 35,
      depositedAt: now - 1.4 * day,
      dueAt: now + 6 * 60 * 60 * 1000,
    })

    await insertRequest(ctx, {
      ref: "GC-2026-EC-002829",
      citizenId: aicha,
      serviceId: svcNationalite,
      organismId: dgEtatCivil,
      assignedAgentId: louis,
      status: "in_instruction",
      progressPct: 50,
      depositedAt: now - 2 * day,
      dueAt: now + day,
    })

    await insertRequest(ctx, {
      ref: "GC-2026-EC-002814",
      citizenId: paulOndo,
      serviceId: svcActeExtrait,
      organismId: dgEtatCivil,
      assignedAgentId: yolande,
      status: "to_sign",
      progressPct: 85,
      depositedAt: now - 3 * day,
      dueAt: now + 4 * 60 * 60 * 1000,
    })

    await insertRequest(ctx, {
      ref: "GC-2026-EC-002802",
      citizenId: nzoghe,
      serviceId: svcDeces,
      organismId: dgEtatCivil,
      status: "waiting_pieces",
      progressPct: 25,
      depositedAt: now - 4 * day,
      dueAt: now + 2 * day,
    })

    // ────────── Pièces sur la demande r1 ──────────
    await ctx.db.insert("pieces", {
      requestId: r1,
      label: "CNI du demandeur",
      filename: "CNI_obame.pdf",
      sizeBytes: 1_200_000,
      status: "validated",
      ocrConfidence: 99.4,
      required: true,
    })
    await ctx.db.insert("pieces", {
      requestId: r1,
      label: "Justificatif de filiation",
      filename: "livret_famille.pdf",
      sizeBytes: 2_800_000,
      status: "validated",
      ocrConfidence: 98,
      required: true,
    })

    // ────────── Vérifications automatiques sur r1 ──────────
    const verifs = [
      ["Identité numérique du citoyen", "NIP validé par le RGPP · 14 mars 1992 confirmé.", "ok"],
      [
        "Cohérence des informations",
        "Pas d'incohérence détectée entre la déclaration et les pièces.",
        "ok",
      ],
      [
        "Détection de doublon",
        "Aucune demande similaire dans les 30 derniers jours.",
        "ok",
      ],
      ["Lecture OCR des pièces", "CNI lue avec 99,4 % de confiance.", "ok"],
      ["Conformité antifraude", "Aucun indicateur de risque déclenché.", "ok"],
      [
        "Recherche au registre de Libreville",
        "En cours · acte 04812 à confirmer manuellement.",
        "pending",
      ],
    ] as const
    for (const [i, [title, description, status]] of verifs.entries()) {
      await ctx.db.insert("verifications", {
        requestId: r1,
        title,
        description,
        status,
        order: i,
      })
    }

    // ────────── Événements timeline r1 ──────────
    await ctx.db.insert("requestEvents", {
      requestId: r1,
      kind: "submission",
      title: "Demande déposée",
      description: "Vos pièces ont été validées automatiquement.",
      actor: "Vous",
      occurredAt: now - 14 * 60 * 60 * 1000,
    })
    await ctx.db.insert("requestEvents", {
      requestId: r1,
      kind: "seal",
      title: "Récépissé scellé émis",
      description: "Empreinte SHA-256 · 8a3c…d09f",
      actor: "Système",
      occurredAt: now - 14 * 60 * 60 * 1000 + 60_000,
    })
    await ctx.db.insert("requestEvents", {
      requestId: r1,
      kind: "assignment",
      title: "Pré-instruction agent",
      description: "Dossier transmis à l'agent Mme NGUEMA.",
      actor: "DG État Civil",
      occurredAt: now - 5 * 60 * 60 * 1000,
    })

    // ────────── Archives SAE (échantillon) ──────────
    await ctx.db.insert("archives", {
      cote: "GA/EC/2026/04812",
      description: "Acte de naissance · OBAME Marie Estelle",
      producerOrganismId: dgEtatCivil,
      versedAt: now - 0.1 * day,
      dua: "Indéf.",
      status: "active",
      finalSort: "Conservation définitive",
      sha256: "8a3c5e7b9f1d4c2a6e8b3d7f5a9c1e2d4b6f8a0c5e7d9b3f1a4c6e8d2b5f9a7c",
    })
    await ctx.db.insert("archives", {
      cote: "GA/EC/2026/04783",
      description: "Acte de mariage · MOUNGUENGUI / OYANE",
      producerOrganismId: dgEtatCivil,
      versedAt: now - 4 * day,
      dua: "Indéf.",
      status: "active",
      finalSort: "Conservation définitive",
      sha256: "b2f1c7d8e9a0b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b791d8",
    })
    await ctx.db.insert("archives", {
      cote: "GA/EC/2022/14829",
      description: "Registre N de Libreville · trimestre 2022",
      producerOrganismId: mairieLbv,
      versedAt: now - 1200 * day,
      dua: "Indéf.",
      status: "archived_final",
      finalSort: "Conservation définitive",
      sha256: "1a9b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8d4e2",
    })

    // ────────── Correspondance inter-admin (A6) ──────────
    const cr1 = await ctx.db.insert("correspondences", {
      ref: "CR-2026-1842",
      fromOrganismId: dgDocumentation,
      toOrganismId: dgEtatCivil,
      subject:
        "Demande d'authentification d'acte de naissance · OBAME Marie",
      body:
        "Madame, Monsieur,\n\nDans le cadre de l'instruction d'une demande de renouvellement de passeport biométrique (réf. GC-2026-DI-019733) déposée par Mme Marie Estelle OBAME, NIP 184 12 76 005 042, nous vous prions de bien vouloir authentifier l'acte de naissance présenté.\n\nActe présenté : EC-LBV-1992-04812, registre de Libreville, année 1992.\n\nCompte tenu du délai de traitement de la demande citoyenne, nous vous saurions gré d'une réponse sous 24 heures.\n\nCordialement,",
      urgent: true,
      confidentiality: "restricted",
      archivePolicy: "2 ans",
      sentAt: now - 12 * 60 * 1000,
      dueAt: now + 24 * 60 * 60 * 1000,
      linkedCitizenId: marie,
      linkedRequestId: r1,
    })
    await ctx.db.insert("correspondenceMessages", {
      correspondenceId: cr1,
      fromAgentId: faustin,
      body: "Madame, Monsieur, …",
      signed: true,
      sentAt: now - 12 * 60 * 1000,
    })

    // Quelques courriers supplémentaires (header preview only)
    const stubs = [
      {
        ref: "CR-2026-1839",
        from: minJustice,
        subject: "Vérification de filiation — extrait",
        sentAt: now - 2 * 60 * 60 * 1000,
      },
      {
        ref: "CR-2026-1834",
        from: cnamgs,
        subject: "Mise à jour identité bénéficiaire",
        sentAt: now - 4 * 60 * 60 * 1000,
      },
      {
        ref: "CR-2026-1828",
        from: mairieLbv,
        subject: "Transfert dossier transcription",
        sentAt: now - day,
      },
      {
        ref: "CR-2026-1819",
        from: dgi,
        subject: "Confirmation d'identité fiscale",
        sentAt: now - 1.2 * day,
      },
      {
        ref: "CR-2026-1814",
        from: anpi,
        subject: "Vérification mandataire RCCM",
        sentAt: now - 2 * day,
      },
    ]
    for (const s of stubs) {
      await ctx.db.insert("correspondences", {
        ref: s.ref,
        fromOrganismId: s.from,
        toOrganismId: dgEtatCivil,
        subject: s.subject,
        body: "Contenu détaillé non importé dans le seed initial.",
        urgent: false,
        confidentiality: "restricted",
        archivePolicy: "2 ans",
        sentAt: s.sentAt,
      })
    }

    return {
      seeded: true,
      organisms: 7,
      agents: 5,
      citizens: 5,
      services: 5,
      requests: 5,
      message:
        "Seed appliqué. Connectez-vous avec NIP 198501100001 (Yolande NGUEMA, DG État Civil).",
    }
  },
})

interface RequestInsertArgs {
  ref: string
  citizenId: Id<"citizens">
  serviceId: Id<"services">
  organismId: Id<"organisms">
  assignedAgentId?: Id<"agents">
  status:
    | "submitted"
    | "in_instruction"
    | "waiting_pieces"
    | "waiting_registry"
    | "to_sign"
    | "issued"
    | "rejected"
    | "cancelled"
  progressPct: number
  depositedAt: number
  dueAt?: number
  payload?: unknown
  internalNote?: string
}

async function insertRequest(
  ctx: MutationCtx,
  args: RequestInsertArgs,
): Promise<Id<"requests">> {
  return ctx.db.insert("requests", args)
}
