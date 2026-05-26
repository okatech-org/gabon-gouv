import type { Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"
import { mutation } from "./lib/triggers"

/**
 * Seed idempotent — recharge les données de base. À appeler une fois pour
 * remplir Convex après le premier `convex dev`.
 *
 * NB : on importe `mutation` depuis `./lib/triggers` (et non `_generated/server`)
 * pour que les écritures du seed alimentent aussi les agrégats Convex (ADR-0007).
 *
 * Côté admin-web on s'attend à pouvoir se connecter avec :
 *  - Yolande NGUEMA      (DG État Civil, agent_instructeur)      NIP 198501100001
 *  - Cyril NDONG         (DG État Civil, chef_service)           NIP 197603100002
 *  - Patrice MOUSSAVOU   (DG État Civil, officier_signataire)    NIP 196812100003
 *  - Faustin MBOUMBA     (DG Documentation, admin_organisme)     NIP 197004100004
 *  - Hervé MOUSSAVOU     (Plateforme, platform_admin)            NIP 196509100099
 */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    // Vider les tables (idempotence) — l'ordre respecte les dépendances inverses.
    const tables = [
      "assistantMessages",
      "assistantConversations",
      "notifications",
      "auditLog",
      "auditDailySeals",
      "teamActivities",
      "infrastructureComponents",
      "dossierAccessGrants",
      "authSessions",
      "signatureCircuitSteps",
      "signatureCircuits",
      "correspondenceReads",
      "correspondenceMessages",
      "correspondences",
      "eliminationBatches",
      "archives",
      "publicVerifications",
      "documents",
      "registryEntries",
      "requestMessages",
      "requestEvents",
      "verifications",
      "pieces",
      "requests",
      "requestDrafts",
      "recommendations",
      "citizenSavedItems",
      "citizenRelations",
      "citizens",
      "documentTemplateVariables",
      "documentTemplates",
      "serviceRequirements",
      "serviceVariants",
      "services",
      "serviceCategories",
      "conventions",
      "onboardingSteps",
      "onboardingProcesses",
      "agents",
      "organisms",
      "provinces",
    ] as const
    for (const table of tables) {
      const rows = await ctx.db.query(table).collect()
      for (const r of rows) await ctx.db.delete(r._id)
    }

    const now = Date.now()
    const day = 1000 * 60 * 60 * 24

    // ════════════════════════════════════════════════════════
    // 1. Référentiels — provinces, catégories de services
    // ════════════════════════════════════════════════════════
    const PROVINCES = [
      ["estuaire", "Estuaire", 1],
      ["haut_ogooue", "Haut-Ogooué", 2],
      ["moyen_ogooue", "Moyen-Ogooué", 3],
      ["ngounie", "Ngounié", 4],
      ["nyanga", "Nyanga", 5],
      ["ogooue_ivindo", "Ogooué-Ivindo", 6],
      ["ogooue_lolo", "Ogooué-Lolo", 7],
      ["ogooue_maritime", "Ogooué-Maritime", 8],
      ["woleu_ntem", "Woleu-Ntem", 9],
    ] as const
    for (const [code, name, order] of PROVINCES) {
      await ctx.db.insert("provinces", { code, name, order })
    }

    const categories = [
      ["etat-civil", "État civil", "user", "#1a4480", 1],
      ["identite", "Identité & voyage", "fingerprint", "#2378c3", 2],
      ["justice", "Justice", "shield", "#4a5876", 3],
      ["entreprise", "Entreprise", "building", "#0a6e54", 4],
      ["fiscalite", "Fiscalité", "dollarSign", "#b88600", 5],
      ["logement", "Logement & foncier", "home", "#6b7a96", 6],
      ["mobilite", "Mobilité", "mapPin", "#73b3e7", 7],
      ["social", "Famille & social", "users", "#a3315a", 8],
    ] as const
    for (const [slug, label, icon, color, order] of categories) {
      await ctx.db.insert("serviceCategories", { slug, label, icon, color, order })
    }

    // ════════════════════════════════════════════════════════
    // 2. Organismes
    // ════════════════════════════════════════════════════════
    const dgEtatCivil = await ctx.db.insert("organisms", {
      name: "Direction Gén. de l'État Civil",
      shortName: "DG État Civil",
      slug: "dg-etat-civil",
      category: "direction_generale",
      tutelage: "Min. Intérieur",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "active",
      connection: "API + SSO",
      connectionKind: "api_sso",
      signedAt: "03/2024",
      siege: "Boulevard Triomphal, Libreville",
      phone: "+241 01 73 12 00",
      contactEmail: "contact@etatcivil.gouv.ga",
      icon: "user",
      color: "#1a4480",
      volume30d: 12184,
      capacityPct: 72,
      avgDelayHours: 42,
      avgSatisfaction: 4.7,
    })

    const dgDocumentation = await ctx.db.insert("organisms", {
      name: "Direction Gén. de la Documentation",
      shortName: "DG Documentation",
      slug: "dg-documentation",
      category: "direction_generale",
      tutelage: "Min. Intérieur",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "active",
      connection: "API + SSO",
      connectionKind: "api_sso",
      signedAt: "03/2024",
      icon: "fingerprint",
      color: "#2378c3",
      volume30d: 9842,
      capacityPct: 88,
      avgDelayHours: 134,
      avgSatisfaction: 4.3,
    })

    const minJustice = await ctx.db.insert("organisms", {
      name: "Ministère de la Justice",
      shortName: "Min. Justice",
      slug: "min-justice",
      category: "ministere",
      tutelage: "Présidence",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "active",
      connection: "API + SSO",
      connectionKind: "api_sso",
      signedAt: "04/2024",
      icon: "shield",
      color: "#4a5876",
      volume30d: 6218,
      capacityPct: 56,
      avgDelayHours: 52,
      avgSatisfaction: 4.5,
    })

    const anpi = await ctx.db.insert("organisms", {
      name: "ANPI-Gabon",
      slug: "anpi-gabon",
      category: "etablissement_public",
      tutelage: "Min. Économie",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "active",
      connection: "API + SSO",
      connectionKind: "api_sso",
      signedAt: "05/2024",
      icon: "building",
      color: "#0a6e54",
      volume30d: 5144,
    })

    const dgi = await ctx.db.insert("organisms", {
      name: "Direction Gén. des Impôts",
      shortName: "DGI",
      slug: "dgi",
      category: "direction_generale",
      tutelage: "Min. Économie",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "active",
      connection: "API + SSO",
      connectionKind: "api_sso",
      signedAt: "04/2024",
      icon: "dollarSign",
      color: "#b88600",
      volume30d: 7412,
    })

    const cnamgs = await ctx.db.insert("organisms", {
      name: "CNAMGS",
      slug: "cnamgs",
      category: "etablissement_public",
      tutelage: "Min. Santé",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "active",
      connection: "API + SSO",
      connectionKind: "api_sso",
      signedAt: "06/2024",
      icon: "shieldCheck",
      color: "#a3315a",
      volume30d: 4218,
      capacityPct: 91,
      avgDelayHours: 96,
      avgSatisfaction: 4.2,
    })

    const mairieLbv = await ctx.db.insert("organisms", {
      name: "Mairie de Libreville",
      slug: "mairie-libreville",
      category: "collectivite",
      tutelage: "Autonome",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "active",
      connection: "Portail",
      connectionKind: "portal",
      signedAt: "01/2025",
      icon: "home",
      color: "#6b7a96",
      volume30d: 3712,
    })

    // Plateforme (Digitalium / Gabon Connect)
    const platformOrg = await ctx.db.insert("organisms", {
      name: "Gabon Connect — Console plateforme",
      shortName: "Plateforme",
      slug: "gabon-connect-platform",
      category: "institution",
      status: "active",
      icon: "activity",
    })

    // Organisme en cours d'onboarding (P3)
    const arsee = await ctx.db.insert("organisms", {
      name: "Autorité de Régulation du Secteur de l'Eau et de l'Énergie",
      shortName: "ARSEE",
      slug: "arsee",
      category: "autorite",
      tutelage: "Présidence",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "onboarding",
      connection: "—",
      connectionKind: "none",
      siege: "Immeuble Pétro Gabon, Libreville",
      nif: "739-A-7818-44",
      phone: "+241 01 73 27 90",
      decretCreation: "n° 2009-1245 du 15 décembre 2009",
      icon: "zap",
    })

    const conseilConst = await ctx.db.insert("organisms", {
      name: "Conseil constitutionnel",
      shortName: "Cons. Constit.",
      slug: "conseil-constitutionnel",
      category: "institution",
      tutelage: "Présidence",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "onboarding",
      connection: "—",
      connectionKind: "none",
      siege: "Place de l'Indépendance, Libreville",
      phone: "+241 01 76 19 22",
      icon: "shield",
    })

    const dgTourisme = await ctx.db.insert("organisms", {
      name: "Direction Gén. du Tourisme",
      shortName: "DG Tourisme",
      slug: "dg-tourisme",
      category: "direction_generale",
      tutelage: "Min. Tourisme et Artisanat",
      province: "Estuaire",
      provinceCode: "estuaire",
      status: "onboarding",
      connection: "—",
      connectionKind: "none",
      icon: "mapPin",
    })

    // Organisme suspendu (P2 — registre)
    const mairieTchibanga = await ctx.db.insert("organisms", {
      name: "Mairie de Tchibanga",
      slug: "mairie-tchibanga",
      category: "collectivite",
      tutelage: "Autonome",
      province: "Nyanga",
      provinceCode: "nyanga",
      status: "suspended",
      connection: "Portail",
      connectionKind: "portal",
      signedAt: "02/2025",
      icon: "home",
      volume30d: 0,
    })

    // ════════════════════════════════════════════════════════
    // 3. Agents
    // ════════════════════════════════════════════════════════
    const yolande = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "198501100001",
      name: "Yolande NGUEMA",
      email: "y.nguema@etatcivil.gouv.ga",
      role: "agent_instructeur",
      function: "Agent instructeur senior",
      authMethod: "nip_carte_agent",
      active: true,
    })

    const cyril = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "197603100002",
      name: "Cyril NDONG",
      email: "c.ndong@etatcivil.gouv.ga",
      role: "chef_service",
      function: "Chef de service",
      authMethod: "nip_carte_agent",
      active: true,
    })

    const patrice = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "196812100003",
      name: "Patrice MOUSSAVOU",
      email: "p.moussavou@etatcivil.gouv.ga",
      role: "officier_signataire",
      function: "Officier d'état civil",
      authMethod: "nip_carte_agent",
      active: true,
    })

    const louis = await ctx.db.insert("agents", {
      organismId: dgEtatCivil,
      nip: "198909100004",
      name: "Louis EYEGHE",
      email: "l.eyeghe@etatcivil.gouv.ga",
      role: "agent_instructeur",
      function: "Agent instructeur",
      authMethod: "nip_carte_agent",
      active: true,
    })

    const faustin = await ctx.db.insert("agents", {
      organismId: dgDocumentation,
      nip: "197004100004",
      name: "Faustin MBOUMBA",
      email: "f.mboumba@documentation.gouv.ga",
      role: "admin_organisme",
      function: "Capitaine, Chef de bureau",
      authMethod: "nip_carte_agent",
      active: true,
    })

    // Platform admin (Digitalium)
    const herve = await ctx.db.insert("agents", {
      organismId: platformOrg,
      nip: "196509100099",
      name: "Hervé MOUSSAVOU",
      email: "h.moussavou@digitalium.ga",
      role: "platform_admin",
      function: "Admin plateforme",
      authMethod: "nip_carte_agent",
      active: true,
    })

    // ════════════════════════════════════════════════════════
    // 4. Citoyens
    // ════════════════════════════════════════════════════════
    // idnSub fictifs pour le seed — à remplacer par les vrais sub IDN issus
    // de citoyen.ga sandbox lors de la 1ère connexion réelle. Voir le
    // README pour la procédure de liaison.
    const marie = await ctx.db.insert("citizens", {
      nip: "184127600504",
      idnSub: "idn-sandbox-marie-obame",
      name: "Marie Estelle OBAME",
      email: "marie.obame@id.gouv.ga",
      phone: "+241 06 24 18 33",
      address: "BP 8112, Akanda",
      addressProvinceCode: "estuaire",
      birthDate: "14 mars 1992",
      birthPlace: "Libreville, Estuaire",
      birthProvinceCode: "estuaire",
      fatherName: "OBAME Jean-Pierre",
      motherName: "MBOUMBA Antoinette",
      sex: "F",
      civilStatus: "single",
      nationality: "Gabonaise",
      identityVerified: true,
      identityVerifiedAt: now - 365 * 2 * day,
      accountCreatedAt: now - 365 * 2.5 * day,
      createdAt: now - 365 * 2.5 * day,
    })

    const jpMoung = await ctx.db.insert("citizens", {
      nip: "178050099218",
      idnSub: "idn-sandbox-jp-mounguengui",
      name: "Jean-Pierre MOUNGUENGUI",
      email: "jp.mounguenguie@id.gouv.ga",
      phone: "+241 06 78 22 14",
      address: "Quartier Glass, Libreville",
      addressProvinceCode: "estuaire",
      birthDate: "5 mai 1978",
      birthPlace: "Port-Gentil",
      birthProvinceCode: "ogooue_maritime",
      sex: "M",
      civilStatus: "married",
      identityVerified: true,
      createdAt: now - 200 * day,
    })

    const aicha = await ctx.db.insert("citizens", {
      nip: "191041100712",
      idnSub: "idn-sandbox-aicha-bongo",
      name: "Aïcha BONGO",
      email: "a.bongo@id.gouv.ga",
      birthDate: "11 avril 1991",
      birthPlace: "Libreville",
      birthProvinceCode: "estuaire",
      sex: "F",
      identityVerified: true,
      createdAt: now - 150 * day,
    })

    const paulOndo = await ctx.db.insert("citizens", {
      nip: "188090677341",
      idnSub: "idn-sandbox-paul-ondo",
      name: "Paul ONDO",
      email: "p.ondo@id.gouv.ga",
      birthDate: "6 septembre 1988",
      birthPlace: "Oyem",
      birthProvinceCode: "woleu_ntem",
      sex: "M",
      identityVerified: true,
      createdAt: now - 120 * day,
    })

    const nzoghe = await ctx.db.insert("citizens", {
      nip: "174030042519",
      idnSub: "idn-sandbox-famille-nzoghe",
      name: "Famille NZOGHE",
      birthDate: "3 mars 1974",
      birthPlace: "Lambaréné",
      birthProvinceCode: "moyen_ogooue",
      identityVerified: true,
      createdAt: now - 90 * day,
    })

    // Relations familiales déclarées (livret de famille)
    await ctx.db.insert("citizenRelations", {
      citizenId: marie,
      kind: "father",
      displayedName: "OBAME Jean-Pierre",
      profession: "instituteur",
    })
    await ctx.db.insert("citizenRelations", {
      citizenId: marie,
      kind: "mother",
      displayedName: "MBOUMBA Antoinette",
      profession: "sage-femme",
    })

    // ════════════════════════════════════════════════════════
    // 5. Services (parent) + variantes + pièces requises + templates
    // ════════════════════════════════════════════════════════

    // — Acte de naissance (parent unique avec 3 variantes — ADR-0005)
    const svcActe = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      categorySlug: "etat-civil",
      slug: "acte-naissance",
      title: "Acte de naissance",
      category: "État civil",
      description:
        "L'acte de naissance est un document d'état civil délivré par votre commune de naissance. Vous pouvez en demander une copie intégrale, un extrait avec filiation ou un extrait sans filiation.",
      legalReferences: ["Art. 71 et suivants du Code civil gabonais"],
      whoCanApply: "L'intéressé majeur, ses ascendants ou descendants.",
      deliveryMode: "online",
      online: true,
      fee: "Gratuit",
      feeFcfa: 0,
      delayHours: 48,
      status: "published",
      satisfaction: 4.7,
      requestsLast30d: 326,
      avgDelayHours: 38,
    })

    const variantCopie = await ctx.db.insert("serviceVariants", {
      serviceId: svcActe,
      key: "copie_integrale",
      label: "Copie intégrale",
      description:
        "Reproduit l'intégralité de l'acte avec toutes les mentions marginales.",
      whoCanApply: "L'intéressé majeur, ses ascendants ou descendants.",
      isDefault: true,
      requestsLast30d: 184,
      avgSatisfaction: 4.7,
      order: 1,
    })

    const variantExtraitFil = await ctx.db.insert("serviceVariants", {
      serviceId: svcActe,
      key: "extrait_avec_filiation",
      label: "Extrait avec filiation",
      description: "Mentionne les noms des parents.",
      whoCanApply: "Pour mariage, succession, nationalité.",
      isDefault: false,
      requestsLast30d: 100,
      avgSatisfaction: 4.7,
      order: 2,
    })

    const variantExtraitSans = await ctx.db.insert("serviceVariants", {
      serviceId: svcActe,
      key: "extrait_sans_filiation",
      label: "Extrait sans filiation",
      description: "Sans mention des parents.",
      whoCanApply: "Toute personne (à partir de l'acte original).",
      isDefault: false,
      requestsLast30d: 42,
      avgSatisfaction: 4.6,
      order: 3,
    })

    // — Autres services
    const svcMariage = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      categorySlug: "etat-civil",
      slug: "acte-mariage",
      title: "Acte de mariage",
      category: "État civil",
      description: "Délivrance d'une copie ou d'un extrait d'acte de mariage.",
      online: true,
      fee: "Gratuit",
      feeFcfa: 0,
      delayHours: 48,
      status: "published",
      satisfaction: 4.6,
      requestsLast30d: 68,
    })

    const svcNationalite = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      categorySlug: "etat-civil",
      slug: "certificat-nationalite",
      title: "Certificat de nationalité",
      category: "État civil",
      online: true,
      fee: "3 000 FCFA",
      feeFcfa: 3000,
      delayHours: 144,
      status: "published",
      satisfaction: 4.2,
      requestsLast30d: 52,
    })

    const svcDeces = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      categorySlug: "etat-civil",
      slug: "acte-deces",
      title: "Acte de décès",
      category: "État civil",
      online: true,
      fee: "Gratuit",
      feeFcfa: 0,
      delayHours: 32,
      status: "published",
      satisfaction: 4.5,
      requestsLast30d: 26,
    })

    // — Services en DRAFT pour démontrer la checklist de publication (Bloc 1)
    // Le 1er n'a que les métadonnées (pas de variante, pas de pièce, pas de
    // template) : checklist majoritairement vide. Permet à l'agent de tester
    // la chaîne create → configurer → publier.
    await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      categorySlug: "etat-civil",
      slug: "transcription-acte-etranger",
      title: "Transcription d'acte étranger",
      category: "État civil",
      description:
        "Transcription dans les registres gabonais d'un acte d'état civil établi à l'étranger.",
      whoCanApply: "Citoyens gabonais ayant un acte étranger à faire reconnaître.",
      fee: "5 000 FCFA",
      feeFcfa: 5000,
      delayHours: 168,
      status: "draft",
      deliveryMode: "hybrid",
      online: true,
    })

    // Le 2e a tout sauf le template validé par comité — case d'usage proche
    // de la mise en prod : « tout est prêt sauf le tampon comité ».
    const svcRectification = await ctx.db.insert("services", {
      organismId: dgEtatCivil,
      categorySlug: "etat-civil",
      slug: "rectification-acte",
      title: "Rectification d'acte",
      category: "État civil",
      description:
        "Correction d'une erreur matérielle dans un acte d'état civil (orthographe, date, lieu).",
      whoCanApply: "Le titulaire de l'acte ou son représentant légal.",
      fee: "2 500 FCFA",
      feeFcfa: 2500,
      delayHours: 240,
      status: "draft",
      deliveryMode: "online",
      online: true,
    })
    const variantRectif = await ctx.db.insert("serviceVariants", {
      serviceId: svcRectification,
      key: "standard",
      label: "Standard",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcRectification,
      label: "Justificatif de l'erreur",
      description:
        "Document officiel attestant de l'orthographe correcte (CNI, passeport, livret).",
      required: true,
      acceptedDocTypes: ["cni", "passeport", "livret_famille"],
      autofillSource: "none",
      order: 0,
    })
    await ctx.db.insert("documentTemplates", {
      serviceVariantId: variantRectif,
      key: "ordonnance-rectification",
      version: "v1",
      title: "Ordonnance de rectification",
      bodyTemplate:
        "RÉPUBLIQUE GABONAISE — Union · Travail · Justice\n\nORDONNANCE DE RECTIFICATION D'ACTE\n\nVu la demande de {{nom}} {{prenoms}}…",
      status: "draft", // pas active → checklist signalera « pas de template actif »
      validatedByComite: false, // case décoché → un autre point à vérifier
    })

    // Pièces requises pour l'acte de naissance
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcActe,
      label: "Pièce d'identité du demandeur",
      description: "CNI, passeport ou permis de conduire en cours de validité.",
      required: true,
      acceptedDocTypes: ["cni", "passeport", "permis_conduire"],
      autofillSource: "citizen_identity",
      order: 1,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcActe,
      label: "Justificatif du lien de filiation",
      description: "Livret de famille ou acte de naissance des parents.",
      required: true,
      acceptedDocTypes: ["livret_famille", "acte_naissance"],
      order: 2,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcActe,
      label: "Mandat signé",
      description: "Si vous effectuez la demande pour un tiers.",
      required: false,
      acceptedDocTypes: ["mandat"],
      order: 3,
    })

    // Template de document — copie intégrale v3.2
    const tplCopie = await ctx.db.insert("documentTemplates", {
      serviceVariantId: variantCopie,
      key: "acte-naissance-copie-integrale",
      version: "v3.2",
      title: "Copie intégrale · officielle",
      bodyTemplate:
        "RÉPUBLIQUE GABONAISE — Union · Travail · Justice\n\nEXTRAIT D'ACTE DE NAISSANCE (Copie intégrale)\n\nNom : {{nom}}\nPrénoms : {{prenoms}}\nNé(e) le {{date_naissance}} à {{heure_naissance}} à {{lieu_naissance}}\nFils/Fille de {{pere}}\nEt de {{mere}}\nMentions marginales : {{mentions}}\nActe n° {{numero_acte}}",
      status: "active",
      validatedByComite: true,
      validatedAt: "14/02/2025",
      legalReference: "Art. 71 et suivants du Code civil gabonais",
    })

    const TEMPLATE_VARS = [
      ["nom", "Nom", "registry_entry", true],
      ["prenoms", "Prénoms", "registry_entry", true],
      ["date_naissance", "Date de naissance", "registry_entry", true],
      ["heure_naissance", "Heure de naissance", "registry_entry", false],
      ["lieu_naissance", "Lieu de naissance", "registry_entry", true],
      ["pere", "Père", "registry_entry", true],
      ["mere", "Mère", "registry_entry", true],
      ["mentions", "Mentions marginales", "registry_entry", false],
      ["numero_acte", "Numéro d'acte", "registry_entry", true],
    ] as const
    for (const [i, [key, label, source, required]] of TEMPLATE_VARS.entries()) {
      await ctx.db.insert("documentTemplateVariables", {
        templateId: tplCopie,
        key,
        label,
        source,
        required,
        order: i,
      })
    }

    // ════════════════════════════════════════════════════════
    // 5b. Catalogue enrichi — services réels cross-organismes
    //     Données issues de docs/real-gabon-procedures.md (cf. sources).
    //     Chaque service est créé publié avec pièces réelles, frais
    //     officiels en FCFA, délais réalistes et références légales.
    // ════════════════════════════════════════════════════════

    /* ----- DG Documentation (DGDI) — CNI, passeport, séjour ----- */

    const svcCni = await ctx.db.insert("services", {
      organismId: dgDocumentation,
      categorySlug: "identite",
      slug: "carte-identite-nationale",
      title: "Carte Nationale d'Identité (CNI)",
      category: "Identité & voyage",
      description:
        "Pièce d'identité officielle obligatoire pour les citoyens gabonais à partir de 16 ans. Valable 10 ans.",
      longDescription:
        "La CNI est délivrée par la DGDI. La CNIE (version électronique) peut être demandée en ligne sur edgdi.dgdi.ga si vous disposez déjà d'un passeport biométrique valide. Sinon, la demande se fait au commissariat ou à la préfecture.",
      legalReferences: [
        "Loi 12/2009 portant Code de la nationalité gabonaise",
        "Décret n° 1259/PR/MISD du 25 octobre 2011",
      ],
      whoCanApply: "Citoyens gabonais à partir de 16 ans.",
      deliveryMode: "hybrid",
      online: true,
      fee: "5 000 FCFA",
      feeFcfa: 5000,
      delayHours: 720, // 1 mois (officiel — réel : 3-6 mois)
      status: "published",
      satisfaction: 3.8,
      requestsLast30d: 412,
    })
    const variantCniFirst = await ctx.db.insert("serviceVariants", {
      serviceId: svcCni,
      key: "premiere_demande",
      label: "Première demande",
      description:
        "Pour les jeunes de 16 ans ou plus n'ayant jamais eu de CNI.",
      whoCanApply: "Citoyens gabonais sans CNI précédente.",
      isDefault: true,
      feeFcfaOverride: 5000,
      order: 0,
    })
    const variantCniRenew = await ctx.db.insert("serviceVariants", {
      serviceId: svcCni,
      key: "renouvellement",
      label: "Renouvellement",
      description: "À l'approche de l'expiration ou en cas de changement d'état civil.",
      whoCanApply: "Titulaires d'une CNI en cours ou expirée.",
      isDefault: false,
      feeFcfaOverride: 5000,
      order: 1,
    })
    const variantCniLost = await ctx.db.insert("serviceVariants", {
      serviceId: svcCni,
      key: "perte_vol",
      label: "Perte ou vol",
      description: "Avec déclaration préalable au commissariat.",
      whoCanApply: "Titulaires ayant déclaré la perte/vol.",
      isDefault: false,
      feeOverride: "10 000 FCFA",
      feeFcfaOverride: 10000,
      order: 2,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcCni,
      label: "Acte de naissance copie intégrale",
      description: "Légalisé, de moins de 3 mois.",
      required: true,
      acceptedDocTypes: ["acte_naissance"],
      autofillSource: "previous_request",
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcCni,
      label: "Certificat de résidence",
      description: "Délivré par le chef de quartier ou la mairie.",
      required: true,
      acceptedDocTypes: ["certificat_residence", "justif_domicile"],
      autofillSource: "none",
      order: 1,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcCni,
      label: "Photos d'identité fond blanc",
      description: "4 photos récentes au format standard.",
      required: true,
      acceptedDocTypes: ["photo_identite"],
      order: 2,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcCni,
      label: "Déclaration de perte",
      description:
        "Délivrée par le commissariat. Uniquement pour la variante « Perte ou vol ».",
      required: false,
      acceptedDocTypes: ["attestation"],
      variantOverrides: [
        {
          variantId: variantCniLost,
          required: true,
          acceptedDocTypes: ["attestation"],
        },
      ],
      order: 3,
    })

    const svcPasseport = await ctx.db.insert("services", {
      organismId: dgDocumentation,
      categorySlug: "identite",
      slug: "passeport-biometrique",
      title: "Passeport biométrique",
      category: "Identité & voyage",
      description:
        "Document de voyage international avec puce biométrique. Donne droit au visa CEMAC d'un mois.",
      legalReferences: ["Décret n° 0648/PR/MISPID du 27 mai 2014"],
      whoCanApply: "Citoyens gabonais. Pour mineurs < 16 ans : autorisation parentale.",
      deliveryMode: "in_person",
      online: false,
      fee: "65 000 FCFA",
      feeFcfa: 65000,
      delayHours: 336, // 14 jours
      status: "published",
      satisfaction: 4.0,
      requestsLast30d: 198,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcPasseport,
      key: "adulte",
      label: "Adulte",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcPasseport,
      key: "mineur",
      label: "Mineur (< 16 ans)",
      description: "Nécessite l'autorisation parentale.",
      isDefault: false,
      order: 1,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcPasseport,
      label: "Acte de naissance original",
      required: true,
      acceptedDocTypes: ["acte_naissance"],
      autofillSource: "previous_request",
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcPasseport,
      label: "CNI en cours de validité",
      required: true,
      acceptedDocTypes: ["cni"],
      autofillSource: "citizen_identity",
      order: 1,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcPasseport,
      label: "Photos d'identité conformes OACI",
      description: "4 photos récentes, format normalisé voyage.",
      required: true,
      acceptedDocTypes: ["photo_identite"],
      order: 2,
    })

    const svcSejour = await ctx.db.insert("services", {
      organismId: dgDocumentation,
      categorySlug: "identite",
      slug: "carte-sejour",
      title: "Carte de séjour",
      category: "Identité & voyage",
      description:
        "Document obligatoire pour tout étranger résidant au Gabon plus de 3 mois.",
      legalReferences: ["Loi 5/86 du 18 juin 1986 sur la condition des étrangers"],
      whoCanApply:
        "Étrangers majeurs séjournant plus de 3 mois au Gabon.",
      deliveryMode: "in_person",
      online: false,
      fee: "À partir de 50 000 FCFA",
      feeFcfa: 50000,
      delayHours: 720,
      status: "published",
      satisfaction: 3.5,
      requestsLast30d: 86,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcSejour,
      key: "temporaire",
      label: "Temporaire (1 an)",
      description: "1re demande, employés, étudiants.",
      isDefault: true,
      feeFcfaOverride: 50000,
      order: 0,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcSejour,
      key: "ordinaire",
      label: "Ordinaire (2 ans)",
      description: "Après 3 ans de résidence continue.",
      isDefault: false,
      feeFcfaOverride: 80000,
      order: 1,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcSejour,
      key: "resident",
      label: "Résident (5 ans)",
      description: "5+ ans de résidence ou conjoint(e) gabonais(e).",
      isDefault: false,
      feeFcfaOverride: 150000,
      order: 2,
    })

    /* ----- Min. Justice — Casier judiciaire B3 ----- */

    const svcCasier = await ctx.db.insert("services", {
      organismId: minJustice,
      categorySlug: "justice",
      slug: "casier-judiciaire-b3",
      title: "Casier judiciaire (Bulletin N°3)",
      category: "Justice",
      description:
        "Extrait du casier judiciaire mentionnant les condamnations pour crimes graves. Délivré par le Tribunal de Première Instance. Valable 3 mois.",
      legalReferences: [
        "Articles 786 à 803 du Code de procédure pénale gabonais",
      ],
      whoCanApply:
        "Tout citoyen gabonais pour lui-même, ou via procuration légalisée.",
      deliveryMode: "hybrid",
      online: true,
      fee: "2 000 FCFA",
      feeFcfa: 2000,
      delayHours: 48,
      status: "published",
      satisfaction: 4.6,
      requestsLast30d: 524,
    })
    const variantCasierSelf = await ctx.db.insert("serviceVariants", {
      serviceId: svcCasier,
      key: "personne_morale_physique",
      label: "Pour soi-même",
      description: "Délai 24-48 h, souvent même jour à Libreville.",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcCasier,
      key: "par_procuration",
      label: "Par procuration",
      description:
        "Pouvoir manuscrit légalisé requis. Délai légèrement plus long.",
      isDefault: false,
      order: 1,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcCasier,
      label: "Pièce d'identité",
      description: "CNI ou passeport en cours de validité.",
      required: true,
      acceptedDocTypes: ["cni", "passeport"],
      autofillSource: "citizen_identity",
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcCasier,
      label: "Acte de naissance copie intégrale",
      description: "De moins de 3 mois.",
      required: true,
      acceptedDocTypes: ["acte_naissance"],
      autofillSource: "previous_request",
      order: 1,
    })
    const reqProcuration = await ctx.db.insert("serviceRequirements", {
      serviceId: svcCasier,
      label: "Pouvoir manuscrit légalisé",
      description:
        "Notaire ou mairie. Uniquement si demande pour autrui.",
      required: false,
      acceptedDocTypes: ["mandat"],
      variantOverrides: [
        {
          variantId: variantCasierSelf,
          required: false,
          acceptedDocTypes: ["mandat"],
        },
      ],
      order: 2,
    })
    void reqProcuration

    /* ----- ANPI — Création d'entreprise ----- */

    const svcSarl = await ctx.db.insert("services", {
      organismId: anpi,
      categorySlug: "entreprise",
      slug: "creation-sarl",
      title: "Création d'une SARL en ligne",
      category: "Entreprise",
      description:
        "Immatriculation 100% en ligne via le Guichet Numérique de l'Investissement (GNI). Capital minimum 100 000 FCFA. RCCM et NIF délivrés sous 24-72 heures.",
      legalReferences: [
        "Acte uniforme OHADA sur le droit des sociétés commerciales et du GIE",
        "Loi 015/2017 portant Code des investissements de la République gabonaise",
      ],
      whoCanApply:
        "Toute personne majeure (gabonaise ou résidente) souhaitant créer une SARL avec 1 à N associés.",
      deliveryMode: "online",
      online: true,
      fee: "85 000 FCFA",
      feeFcfa: 85000,
      delayHours: 72,
      status: "published",
      satisfaction: 4.7,
      requestsLast30d: 218,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcSarl,
      key: "sarl_unipersonnelle",
      label: "SARL unipersonnelle",
      description: "Un seul associé. Idéal pour entrepreneurs individuels.",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcSarl,
      key: "sarl_pluripersonnelle",
      label: "SARL pluripersonnelle",
      description: "Plusieurs associés (2 minimum).",
      isDefault: false,
      order: 1,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcSarl,
      label: "Pièce d'identité du/des gérant(s)",
      required: true,
      acceptedDocTypes: ["cni", "passeport"],
      autofillSource: "citizen_identity",
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcSarl,
      label: "Justificatif de domicile du gérant",
      description: "De moins de 3 mois.",
      required: true,
      acceptedDocTypes: ["justif_domicile"],
      order: 1,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcSarl,
      label: "Statuts signés",
      description: "Format PDF, signés par tous les associés.",
      required: true,
      acceptedDocTypes: ["autre"],
      order: 2,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcSarl,
      label: "Déclaration de non-condamnation",
      description: "Signée par chaque dirigeant.",
      required: true,
      acceptedDocTypes: ["attestation"],
      order: 3,
    })

    const svcEi = await ctx.db.insert("services", {
      organismId: anpi,
      categorySlug: "entreprise",
      slug: "creation-entreprise-individuelle",
      title: "Création d'une entreprise individuelle (EI)",
      category: "Entreprise",
      description:
        "Statut le plus léger pour démarrer une activité commerciale. Aucun capital minimum, formalités simplifiées.",
      legalReferences: ["Acte uniforme OHADA"],
      whoCanApply: "Personnes physiques souhaitant entreprendre en nom propre.",
      deliveryMode: "online",
      online: true,
      fee: "30 000 FCFA",
      feeFcfa: 30000,
      delayHours: 48,
      status: "published",
      satisfaction: 4.5,
      requestsLast30d: 142,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcEi,
      key: "standard",
      label: "Standard",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcEi,
      label: "Pièce d'identité",
      required: true,
      acceptedDocTypes: ["cni", "passeport"],
      autofillSource: "citizen_identity",
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcEi,
      label: "Justificatif de domicile",
      required: true,
      acceptedDocTypes: ["justif_domicile"],
      order: 1,
    })

    /* ----- DGI — e-Tax ----- */

    const svcETax = await ctx.db.insert("services", {
      organismId: dgi,
      categorySlug: "fiscalite",
      slug: "teledeclaration-e-tax",
      title: "Télédéclaration fiscale (e-Tax)",
      category: "Fiscalité",
      description:
        "Dépôt en ligne des déclarations mensuelles (TVA, IRPP retenu) et annuelles. Plateforme accessible 24/7 via votre NIF.",
      legalReferences: [
        "Code Général des Impôts gabonais",
        "Arrêté n° 0042/MEPPDD/SG/DGI du 18 mars 2022",
      ],
      whoCanApply:
        "Entreprises assujetties à la TVA, à l'IRPP retenu, et professions libérales.",
      deliveryMode: "online",
      online: true,
      fee: "Gratuit",
      feeFcfa: 0,
      delayHours: 1,
      status: "published",
      satisfaction: 3.9,
      requestsLast30d: 1842,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcETax,
      key: "tva_mensuelle",
      label: "TVA mensuelle",
      description: "Dépôt avant le 20 du mois suivant.",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcETax,
      key: "irpp_annuelle",
      label: "IRPP annuelle",
      description: "Bilan à déposer avant le 31 mars.",
      isDefault: false,
      order: 1,
    })

    /* ----- CNAMGS — Consultation droits ----- */

    const svcCnamgs = await ctx.db.insert("services", {
      organismId: cnamgs,
      categorySlug: "social",
      slug: "consultation-droits-cnamgs",
      title: "Consultation de vos droits CNAMGS",
      category: "Famille & social",
      description:
        "Vérification en ligne de votre couverture maladie : statut d'affiliation, cotisations à jour, prestations consommées.",
      legalReferences: ["Loi 2/95 du 14 janvier 1995 portant régime CNAMGS"],
      whoCanApply:
        "Assurés CNAMGS actifs ou inactifs disposant de leur numéro d'assuré.",
      deliveryMode: "online",
      online: true,
      fee: "Gratuit",
      feeFcfa: 0,
      delayHours: 1,
      status: "published",
      satisfaction: 4.3,
      requestsLast30d: 1218,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcCnamgs,
      key: "consultation_droits",
      label: "Vérification des droits",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcCnamgs,
      key: "attestation_affiliation",
      label: "Téléchargement d'attestation",
      description: "PDF officiel à présenter en pharmacie ou hôpital.",
      isDefault: false,
      order: 1,
    })

    /* ----- Mairie de Libreville — Certificat de résidence ----- */

    const svcResidence = await ctx.db.insert("services", {
      organismId: mairieLbv,
      categorySlug: "etat-civil",
      slug: "certificat-residence",
      title: "Certificat de résidence",
      category: "État civil",
      description:
        "Atteste de votre domicile au Gabon. Exigé pour la CNI, le mariage, l'inscription scolaire et de nombreuses démarches.",
      legalReferences: ["Loi 35/62 sur l'état civil — disposition réglementaire commune"],
      whoCanApply: "Toute personne résidant à Libreville depuis au moins 3 mois.",
      deliveryMode: "hybrid",
      online: false,
      fee: "1 500 FCFA",
      feeFcfa: 1500,
      delayHours: 24,
      status: "published",
      satisfaction: 4.1,
      requestsLast30d: 762,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcResidence,
      key: "standard",
      label: "Standard",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcResidence,
      label: "Pièce d'identité",
      required: true,
      acceptedDocTypes: ["cni", "passeport"],
      autofillSource: "citizen_identity",
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcResidence,
      label: "Justificatif de domicile",
      description: "Facture SEEG, contrat de bail, attestation chef de quartier.",
      required: true,
      acceptedDocTypes: ["justif_domicile", "attestation"],
      order: 1,
    })

    const svcLegalisation = await ctx.db.insert("services", {
      organismId: mairieLbv,
      categorySlug: "etat-civil",
      slug: "legalisation-signature",
      title: "Légalisation de signature",
      category: "État civil",
      description:
        "Certification par la mairie qu'une signature apposée devant l'officier d'état civil est bien celle de la personne mentionnée.",
      whoCanApply:
        "Toute personne se présentant en personne avec une pièce d'identité valide.",
      deliveryMode: "in_person",
      online: false,
      fee: "500 FCFA",
      feeFcfa: 500,
      delayHours: 1,
      status: "published",
      satisfaction: 4.8,
      requestsLast30d: 412,
    })
    await ctx.db.insert("serviceVariants", {
      serviceId: svcLegalisation,
      key: "standard",
      label: "Standard",
      isDefault: true,
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcLegalisation,
      label: "Pièce d'identité originale",
      required: true,
      acceptedDocTypes: ["cni", "passeport"],
      autofillSource: "citizen_identity",
      order: 0,
    })
    await ctx.db.insert("serviceRequirements", {
      serviceId: svcLegalisation,
      label: "Document à légaliser",
      description: "À présenter en original.",
      required: true,
      acceptedDocTypes: ["autre"],
      order: 1,
    })

    void variantCniFirst
    void variantCniRenew

    // ════════════════════════════════════════════════════════
    // 6. Registre civil — acte source de Marie (ADR-0011)
    // ════════════════════════════════════════════════════════
    const registryMarie = await ctx.db.insert("registryEntries", {
      registerCode: "EC-LBV-1992-N",
      kind: "birth",
      actNumber: "04812",
      pageNumber: 218,
      orderNumber: 4812,
      year: 1992,
      commune: "Libreville",
      provinceCode: "estuaire",
      transcription:
        "L'an mil neuf cent quatre-vingt douze, le quatorze mars à trois heures vingt-deux minutes, est née à Libreville (province de l'Estuaire), OBAME Marie Estelle, de sexe féminin, fille de OBAME Jean-Pierre, instituteur, et de MBOUMBA Antoinette, sage-femme, son épouse, demeurant ensemble à Libreville…",
      marginalMentions: [],
      linkedCitizenId: marie,
      accuracyLevel: "verified",
      verifiedAt: now - 14 * 60 * 60 * 1000,
      verifiedByAgentId: yolande,
    })

    // ════════════════════════════════════════════════════════
    // 7. Demandes citoyennes
    // ════════════════════════════════════════════════════════
    const r1 = await insertRequest(ctx, {
      ref: "GC-2026-EC-002841",
      citizenId: marie,
      serviceId: svcActe,
      serviceVariantId: variantCopie,
      organismId: dgEtatCivil,
      assignedAgentId: yolande,
      status: "in_instruction",
      progressPct: 60,
      progressStepName: "Recherche au registre",
      depositedAt: now - 14 * 60 * 60 * 1000,
      dueAt: now + day,
      numberOfCopies: 2,
      recipientEmail: "marie.obame@id.gouv.ga",
      beneficiaryKind: "self",
      payload: { copies: 2, variant: "copie intégrale" },
      internalNote:
        "Registre LBV confirmé visuellement le 21/05. Pas de mentions marginales. Demande standard, traitement nominal.",
      consents: { honor: true, rgpd: true, consentedAt: now - 14 * 60 * 60 * 1000 },
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
      urgent: true,
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

    const r4 = await insertRequest(ctx, {
      ref: "GC-2026-EC-002814",
      citizenId: paulOndo,
      serviceId: svcActe,
      serviceVariantId: variantExtraitFil,
      organismId: dgEtatCivil,
      assignedAgentId: yolande,
      status: "to_sign",
      progressPct: 85,
      depositedAt: now - 3 * day,
      dueAt: now + 4 * 60 * 60 * 1000,
      urgent: true,
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

    // ════════════════════════════════════════════════════════
    // 8. Pièces / vérifications / événements pour r1
    // ════════════════════════════════════════════════════════
    await ctx.db.insert("pieces", {
      requestId: r1,
      label: "CNI du demandeur",
      docType: "cni",
      filename: "CNI_obame.pdf",
      sizeBytes: 1_200_000,
      mimeType: "application/pdf",
      status: "validated",
      ocrConfidence: 99.4,
      required: true,
      uploadedAt: now - 14 * 60 * 60 * 1000,
      validatedAt: now - 13 * 60 * 60 * 1000,
      validatedByAgentId: yolande,
    })
    await ctx.db.insert("pieces", {
      requestId: r1,
      label: "Justificatif de filiation",
      docType: "livret_famille",
      filename: "livret_famille.pdf",
      sizeBytes: 2_800_000,
      mimeType: "application/pdf",
      status: "validated",
      ocrConfidence: 98,
      required: true,
      uploadedAt: now - 14 * 60 * 60 * 1000,
      validatedAt: now - 13 * 60 * 60 * 1000,
    })

    const verifs = [
      ["Identité numérique du citoyen", "identity", "NIP validé par le RGPP · 14 mars 1992 confirmé.", "ok"],
      ["Cohérence des informations", "data_consistency", "Pas d'incohérence détectée entre la déclaration et les pièces.", "ok"],
      ["Détection de doublon", "duplicate_detection", "Aucune demande similaire dans les 30 derniers jours.", "ok"],
      ["Lecture OCR des pièces", "ocr_quality", "CNI lue avec 99,4 % de confiance.", "ok"],
      ["Conformité antifraude", "antifraud", "Aucun indicateur de risque déclenché.", "ok"],
      ["Recherche au registre de Libreville", "registry_match", "En cours · acte 04812 à confirmer manuellement.", "pending"],
    ] as const
    for (const [i, [title, kind, description, status]] of verifs.entries()) {
      await ctx.db.insert("verifications", {
        requestId: r1,
        title,
        kind,
        description,
        status,
        automated: true,
        order: i,
      })
    }

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
      actorAgentId: yolande,
      occurredAt: now - 5 * 60 * 60 * 1000,
    })

    // Messages 1:1 citoyen ↔ agent (C5)
    await ctx.db.insert("requestMessages", {
      requestId: r1,
      fromKind: "citizen",
      fromCitizenId: marie,
      body: "Bonjour, merci beaucoup. Aurai-je besoin de me déplacer en mairie ?",
      sentAt: now - 13 * 60 * 60 * 1000,
      readAtByCounterparty: now - 12 * 60 * 60 * 1000,
    })
    await ctx.db.insert("requestMessages", {
      requestId: r1,
      fromKind: "agent",
      fromAgentId: yolande,
      body:
        "Bonjour Marie, je prends en charge votre dossier. La vérification du registre prendra environ 24h, je reviens vers vous dès demain.",
      sentAt: now - 11 * 60 * 60 * 1000,
    })

    // ════════════════════════════════════════════════════════
    // 9. Circuit de signature pour r4 (to_sign)
    // ════════════════════════════════════════════════════════
    // Document préparé en brouillon (ADR-0009 — la signature se fait via le circuit)
    const docDraft = await ctx.db.insert("documents", {
      actNumber: "EC-LBV-2026-04815",
      requestId: r4,
      citizenId: paulOndo,
      issuedByAgentId: yolande,
      organismId: dgEtatCivil,
      title: "Acte de naissance · extrait avec filiation",
      templateId: tplCopie,
      templateVersion: "v3.2",
      status: "prepared",
      issuedAt: now,
      sha256: "placeholder-r4",
      qualifiedTimestamp: "—",
      qrCode: "GC-EC-4815",
      verificationCode: "GC-EC-4815",
      payload: { name: "Paul ONDO" },
    })
    const circuit = await ctx.db.insert("signatureCircuits", {
      subjectKind: "document",
      subjectId: docDraft,
      status: "active",
      startedAt: now - 2 * 60 * 60 * 1000,
    })
    await ctx.db.patch(docDraft, { signatureCircuitId: circuit })
    await ctx.db.insert("signatureCircuitSteps", {
      circuitId: circuit,
      order: 0,
      assigneeAgentId: yolande,
      assigneeRoleSnapshot: "agent_instructeur",
      status: "done",
      decidedAt: now - 1.5 * 60 * 60 * 1000,
    })
    await ctx.db.insert("signatureCircuitSteps", {
      circuitId: circuit,
      order: 1,
      assigneeAgentId: cyril,
      assigneeRoleSnapshot: "chef_service",
      status: "active",
    })
    await ctx.db.insert("signatureCircuitSteps", {
      circuitId: circuit,
      order: 2,
      assigneeAgentId: patrice,
      assigneeRoleSnapshot: "officier_signataire",
      status: "pending",
    })

    // ════════════════════════════════════════════════════════
    // 10. Archives SAE
    // ════════════════════════════════════════════════════════
    await ctx.db.insert("archives", {
      cote: "GA/EC/2026/04812",
      description: "Acte de naissance · OBAME Marie Estelle",
      producerOrganismId: dgEtatCivil,
      versedAt: now - 0.1 * day,
      dua: "Indéf.",
      status: "active",
      finalSort: "Conservation définitive",
      finalDisposition: "conservation_definitive",
      sha256: "8a3c5e7b9f1d4c2a6e8b3d7f5a9c1e2d4b6f8a0c5e7d9b3f1a4c6e8d2b5f9a7c",
      qualifiedTimestamp: "28 mai 2026 · 16:47:22 UTC+1",
      sizeBytes: 348_000,
      storageReplicas: ["owendo", "mvengue"],
      lastIntegrityCheckAt: now - 4 * day,
      lastIntegrityCheckOutcome: "ok",
    })
    await ctx.db.insert("archives", {
      cote: "GA/EC/2026/04783",
      description: "Acte de mariage · MOUNGUENGUI / OYANE",
      producerOrganismId: dgEtatCivil,
      versedAt: now - 4 * day,
      dua: "Indéf.",
      status: "active",
      finalSort: "Conservation définitive",
      finalDisposition: "conservation_definitive",
      sha256: "b2f1c7d8e9a0b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b791d8",
      sizeBytes: 412_000,
    })
    await ctx.db.insert("archives", {
      cote: "GA/EC/2022/14829",
      description: "Registre N de Libreville · trimestre 2022",
      producerOrganismId: mairieLbv,
      versedAt: now - 1200 * day,
      dua: "Indéf.",
      status: "archived_final",
      finalSort: "Conservation définitive",
      finalDisposition: "conservation_definitive",
      sha256: "1a9b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8d4e2",
      sizeBytes: 28_400_000,
    })

    // ════════════════════════════════════════════════════════
    // 11. Correspondance inter-admin (Bloc 5)
    // ════════════════════════════════════════════════════════

    // 11a. Seed des règles métier par kind (16 valeurs cf spec §4.2)
    const KIND_RULES = [
      ["instruction_request", false, false, "5y", 7, 30, 90, "restricted"],
      ["instruction_transmission", false, false, "5y", 7, 30, 90, "restricted"],
      ["instruction_response", false, false, "5y", 7, 30, 90, "restricted"],
      ["decision_grant", true, true, "30y", 7, undefined, 90, "restricted"],
      ["decision_reject", true, true, "30y", 7, undefined, 90, "restricted"],
      ["decision_suspend", true, true, "30y", 7, undefined, 90, "restricted"],
      ["cooperation_info_share", false, false, "2y", 14, 30, 90, "restricted"],
      ["cooperation_data_request", false, false, "2y", 14, 30, 90, "restricted"],
      ["cooperation_fraud_alert", false, false, "5y", 3, 14, 90, "confidential"],
      ["escalation_tutelle", true, true, "50y", 3, 14, 180, "confidential"],
      ["escalation_dispute", true, true, "50y", 3, 14, 180, "confidential"],
      ["escalation_incident", true, true, "50y", 3, 14, 180, "confidential"],
      ["internal_circular", false, false, "indef", undefined, undefined, undefined, "restricted"],
      ["internal_service_note", false, false, "5y", undefined, undefined, 90, "restricted"],
      ["protocol_greeting", false, false, "1y", undefined, undefined, 30, "public"],
      ["protocol_condolences", false, false, "1y", undefined, undefined, 30, "public"],
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

    // 11b. Correspondance exemple (rétrocompat — sera enrichie en Phase B
    // avec recipients, acks, attachments structurés)
    const cr1 = await ctx.db.insert("correspondences", {
      ref: "CR-2026-1842",
      fromOrganismId: dgDocumentation,
      toOrganismId: dgEtatCivil,
      subject: "Demande d'authentification d'acte de naissance · OBAME Marie",
      body:
        "Madame, Monsieur,\n\nDans le cadre de l'instruction d'une demande de renouvellement de passeport biométrique (réf. GC-2026-DI-019733) déposée par Mme Marie Estelle OBAME, NIP 184 12 76 005 042, nous vous prions de bien vouloir authentifier l'acte de naissance présenté.\n\nActe présenté : EC-LBV-1992-04812, registre de Libreville, année 1992.\n\nCordialement,",
      urgent: true,
      confidentiality: "restricted",
      archivePolicy: "2 ans",
      status: "sent",
      sentAt: now - 12 * 60 * 1000,
      dueAt: now + 24 * 60 * 60 * 1000,
      linkedCitizenId: marie,
      linkedRequestId: r1,
      participantsCount: 3,
    })
    await ctx.db.insert("correspondenceMessages", {
      correspondenceId: cr1,
      fromAgentId: faustin,
      body: "Madame, Monsieur, …",
      signed: true,
      sentAt: now - 12 * 60 * 1000,
    })

    const crStubs = [
      ["CR-2026-1839", minJustice, "Vérification de filiation — extrait", 2 * 60 * 60 * 1000],
      ["CR-2026-1834", cnamgs, "Mise à jour identité bénéficiaire", 4 * 60 * 60 * 1000],
      ["CR-2026-1828", mairieLbv, "Transfert dossier transcription", day],
      ["CR-2026-1819", dgi, "Confirmation d'identité fiscale", 1.2 * day],
      ["CR-2026-1814", anpi, "Vérification mandataire RCCM", 2 * day],
    ] as const
    for (const [ref, from, subject, ago] of crStubs) {
      await ctx.db.insert("correspondences", {
        ref,
        fromOrganismId: from,
        toOrganismId: dgEtatCivil,
        subject,
        body: "Contenu détaillé non importé dans le seed initial.",
        urgent: false,
        confidentiality: "restricted",
        archivePolicy: "2 ans",
        status: "sent",
        sentAt: now - ago,
      })
    }

    // ════════════════════════════════════════════════════════
    // 12. Habilitations sur le dossier de Marie (A4)
    // ════════════════════════════════════════════════════════
    await ctx.db.insert("dossierAccessGrants", {
      citizenId: marie,
      organismId: dgEtatCivil,
      level: "read_write",
      grantedByAgentId: cyril,
      grantedAt: now - 365 * day,
    })
    await ctx.db.insert("dossierAccessGrants", {
      citizenId: marie,
      organismId: dgDocumentation,
      level: "read",
      grantedByAgentId: cyril,
      grantedAt: now - 30 * day,
    })
    await ctx.db.insert("dossierAccessGrants", {
      citizenId: marie,
      organismId: minJustice,
      level: "read_subset",
      scope: "B3",
      grantedByAgentId: cyril,
      grantedAt: now - 90 * day,
    })

    // ════════════════════════════════════════════════════════
    // 13. Onboarding ARSEE + convention (P3)
    // ════════════════════════════════════════════════════════
    const onboardingArsee = await ctx.db.insert("onboardingProcesses", {
      organismId: arsee,
      currentStepKey: "convention",
      initiatedByAgentId: herve,
      initiatedAt: now - 21 * day,
    })
    const ONBOARDING_STEPS = [
      ["identification", 0, "done"],
      ["referents", 1, "done"],
      ["habilitations", 2, "done"],
      ["convention", 3, "active"],
      ["services_catalog", 4, "pending"],
      ["integration_tests", 5, "pending"],
      ["production", 6, "pending"],
    ] as const
    for (const [key, order, status] of ONBOARDING_STEPS) {
      await ctx.db.insert("onboardingSteps", {
        processId: onboardingArsee,
        key,
        order,
        status,
        completedAt: status === "done" ? now - (21 - order * 4) * day : undefined,
      })
    }
    await ctx.db.insert("conventions", {
      organismId: arsee,
      version: "v2.4",
      title: "Convention d'adhésion Gabon Connect · ARSEE",
      articleChecklist: [
        { articleNumber: "1", label: "Objet et périmètre", accepted: true },
        { articleNumber: "4", label: "Engagements de service (SLA, support)", accepted: true },
        { articleNumber: "7", label: "Protection des données (loi 001/2011)", accepted: true },
        { articleNumber: "11", label: "Tarification & facturation", accepted: false },
      ],
      status: "pending_signature",
      generatedAt: now - 5 * day,
    })

    // Référents désignés pour ARSEE
    const ARSEE_REFERENTS = [
      ["M. Théophile NTOUTOUME", "Directeur général", "t.ntoutoume@arsee.ga", "admin_organisme", "nip_carte_agent"],
      ["Mme Léa MENGUE", "Chef du service juridique", "l.mengue@arsee.ga", "agent_superviseur", "nip_carte_agent"],
      ["M. Eric ASSEKO", "DSI", "e.asseko@arsee.ga", "admin_technique", "nip_cle_api"],
    ] as const
    for (const [name, fn, email, role, auth] of ARSEE_REFERENTS) {
      await ctx.db.insert("onboardingReferents", {
        processId: onboardingArsee,
        fullName: name,
        functionTitle: fn,
        email,
        role,
        authMethod: auth,
        createdAt: now - 10 * day,
      })
    }

    // Onboarding plus jeune — Conseil constitutionnel (étape référents)
    const onboardingConst = await ctx.db.insert("onboardingProcesses", {
      organismId: conseilConst,
      currentStepKey: "referents",
      initiatedByAgentId: herve,
      initiatedAt: now - 8 * day,
    })
    for (let i = 0; i < 7; i++) {
      const key = (
        [
          "identification",
          "referents",
          "habilitations",
          "convention",
          "services_catalog",
          "integration_tests",
          "production",
        ] as const
      )[i]
      await ctx.db.insert("onboardingSteps", {
        processId: onboardingConst,
        key,
        order: i,
        status: i === 0 ? "done" : i === 1 ? "active" : "pending",
        completedAt: i === 0 ? now - 6 * day : undefined,
      })
    }

    // Onboarding tout neuf — DG Tourisme (étape identification)
    const onboardingTour = await ctx.db.insert("onboardingProcesses", {
      organismId: dgTourisme,
      currentStepKey: "identification",
      initiatedByAgentId: herve,
      initiatedAt: now - 2 * day,
    })
    for (let i = 0; i < 7; i++) {
      const key = (
        [
          "identification",
          "referents",
          "habilitations",
          "convention",
          "services_catalog",
          "integration_tests",
          "production",
        ] as const
      )[i]
      await ctx.db.insert("onboardingSteps", {
        processId: onboardingTour,
        key,
        order: i,
        status: i === 0 ? "active" : "pending",
      })
    }

    // ════════════════════════════════════════════════════════
    // 13bis. Activité d'équipe (P1 — feed plateforme)
    // ════════════════════════════════════════════════════════
    const ACTIVITY = [
      [yolande, "Yolande NGUEMA · DG État Civil", "a publié", "services", "Légalisation de signature", "/services", "layers", 18 * 60 * 1000],
      [faustin, "Faustin MBOUMBA · DG Documentation", "a modifié", "services", "Workflow Passeport v3.1", "/services", "edit", 60 * 60 * 1000],
      [herve, "Hervé MOUSSAVOU · Plateforme", "a accordé l'accès à", "organisms", "DG Tourisme", "/organisations", "userCheck", 3 * 60 * 60 * 1000],
      [cyril, "Cyril NDONG · DG État Civil", "a signé", "documents", "Acte EC-LBV-2026-04812", "/correspondance", "shieldCheck", 4 * 60 * 60 * 1000],
      [patrice, "Patrice MOUSSAVOU · DG État Civil", "a versé au SAE", "archives", "32 actes (Cote GA/EC/2026/048xx)", "/archives", "archive", 6 * 60 * 60 * 1000],
      [herve, "Hervé MOUSSAVOU · Plateforme", "a initié l'onboarding de", "organisms", "Conseil constitutionnel", "/onboarding", "userCheck", 8 * day],
      [herve, "Hervé MOUSSAVOU · Plateforme", "a initié l'onboarding de", "organisms", "DG Tourisme", "/onboarding", "userCheck", 2 * day],
      [herve, "Hervé MOUSSAVOU · Plateforme", "a suspendu", "organisms", "Mairie de Tchibanga", "/organisations", "alertTriangle", 12 * 60 * 60 * 1000],
    ] as const
    for (const [agentId, displayName, verb, subjectKind, label, link, icon, ago] of ACTIVITY) {
      await ctx.db.insert("teamActivities", {
        actorAgentId: agentId,
        actorDisplayName: displayName,
        verb,
        subjectKind,
        subjectLabel: label,
        linkTo: link,
        iconKey: icon,
        occurredAt: now - ago,
      })
    }

    // ════════════════════════════════════════════════════════
    // 14. Composants d'infrastructure (P1)
    // ════════════════════════════════════════════════════════
    const COMPONENTS = [
      ["api_public", "API publique", "/v1 · 99,998 % · 47 ms", "ok", 99.998, 47],
      ["rgpp", "Identité numérique", "RGPP · 99,87 %", "ok", 99.87, 80],
      ["sae", "SAE Archives", "NF Z42-013 · 100 %", "ok", 100, 150],
      ["smime", "Messagerie inter-admin", "S/MIME · 99,99 %", "ok", 99.99, 60],
      ["pdf", "Génération PDF", "4 nœuds · 124 req/s", "ok", 99.95, 220],
      ["cdn_gabon", "CDN Gabon", "Owendo + Mvengue", "degraded", 99.7, 320],
    ] as const
    for (const [key, label, description, status, uptime, latency] of COMPONENTS) {
      await ctx.db.insert("infrastructureComponents", {
        key,
        label,
        description,
        currentStatus: status,
        uptimePct30d: uptime,
        latencyMsP95: latency,
        lastCheckedAt: now - 60_000,
      })
    }

    // ════════════════════════════════════════════════════════
    // 15. Notifications — un échantillon par audience
    // ════════════════════════════════════════════════════════
    // Citoyen Marie
    await ctx.db.insert("notifications", {
      recipientKind: "citizen",
      recipientId: marie,
      kind: "piece_requested",
      severity: "warning",
      title: "Pièce manquante — passeport",
      body: "Merci de joindre le justificatif de domicile actualisé.",
      linkTo: "/demandes/GC-2026-DI-019733",
      createdAt: now - 2 * 60 * 60 * 1000,
    })
    await ctx.db.insert("notifications", {
      recipientKind: "citizen",
      recipientId: marie,
      kind: "document_ready",
      severity: "success",
      title: "Votre extrait B3 est prêt",
      body: "Téléchargez-le depuis votre espace.",
      linkTo: "/documents/GC-2026-JU-007612",
      readAt: now - day,
      createdAt: now - day - 60_000,
    })
    // Agent Yolande
    await ctx.db.insert("notifications", {
      recipientKind: "agent",
      recipientId: yolande,
      kind: "deadline_approaching",
      severity: "danger",
      title: "Échéance dépassée — 2 dossiers",
      body: "Références GC-2026-EC-002814 et GC-2026-EC-002791.",
      linkedRequestId: r4,
      createdAt: now - 30 * 60 * 1000,
    })
    // Platform admin Hervé
    await ctx.db.insert("notifications", {
      recipientKind: "platform_admin",
      recipientId: herve,
      kind: "org_slo_breach",
      severity: "warning",
      title: "CNAMGS · délai de traitement en hausse",
      body: "Le délai moyen est passé à 4 j (+38 % vs 7 j précédents).",
      linkedOrganismId: cnamgs,
      createdAt: now - 60 * 60 * 1000,
    })
    await ctx.db.insert("notifications", {
      recipientKind: "platform_admin",
      recipientId: herve,
      kind: "onboarding_update",
      severity: "info",
      title: "3 nouvelles administrations en onboarding",
      body: "ARSEE, Conseil constitutionnel, DG Tourisme.",
      createdAt: now - 3 * 60 * 60 * 1000,
    })

    // ════════════════════════════════════════════════════════
    // 16. Recommandations citoyen (C3)
    // ════════════════════════════════════════════════════════
    await ctx.db.insert("recommendations", {
      citizenId: marie,
      serviceId: svcActe,
      reason: "expiring_document",
      urgent: true,
      description: "Votre CNI expire dans 8 mois — renouvelez-la avant la rentrée.",
      createdAt: now - 7 * day,
    })

    return {
      seeded: true,
      organisms: 12,
      agents: 6,
      citizens: 5,
      services: 16, // 4 EC publiés + 2 drafts EC + 3 DGDI + 1 Justice + 2 ANPI + 1 DGI + 1 CNAMGS + 2 Mairie LBV
      serviceVariants: 21, // ≈ 3 acte + 1 chacun pour les services à variante unique + 2-3 pour les autres
      requests: 5,
      onboardingProcesses: 3,
      activities: 8,
      message:
        "Seed appliqué. Connectez-vous avec NIP 198501100001 (Yolande NGUEMA, DG État Civil) ou NIP 196509100099 (Hervé MOUSSAVOU, plateforme).",
    }
  },
})

interface RequestInsertArgs {
  ref: string
  citizenId: Id<"citizens">
  serviceId: Id<"services">
  serviceVariantId?: Id<"serviceVariants">
  organismId: Id<"organisms">
  assignedAgentId?: Id<"agents">
  status:
    | "submitted"
    | "in_instruction"
    | "waiting_pieces"
    | "waiting_registry"
    | "prepared"
    | "to_sign"
    | "issued"
    | "rejected"
    | "cancelled"
  progressPct: number
  progressStepName?: string
  depositedAt: number
  dueAt?: number
  numberOfCopies?: number
  recipientEmail?: string
  beneficiaryKind?: "self" | "third_party"
  urgent?: boolean
  payload?: unknown
  internalNote?: string
  consents?: { honor: boolean; rgpd: boolean; consentedAt: number }
}

async function insertRequest(
  ctx: MutationCtx,
  args: RequestInsertArgs,
): Promise<Id<"requests">> {
  return ctx.db.insert("requests", args)
}
