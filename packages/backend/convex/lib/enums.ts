/**
 * Source de vérité pour toutes les énumérations du domaine Gabon Connect.
 *
 * Pattern (voir ADR-0003) : pour chaque enum on exporte trois artefacts :
 *   - le tuple `as const` en SCREAMING_SNAKE_CASE pluriel — runtime, itérable
 *   - le type TypeScript en PascalCase singulier — pour les signatures
 *   - le validator Convex en camelCase singulier + suffixe Validator — pour
 *     defineTable et les arguments de query/mutation/action
 *
 * Toutes les fonctions Convex doivent référencer ces constantes plutôt que
 * de réécrire des `v.union(v.literal(...), ...)` à la main.
 */

import { literals } from "convex-helpers/validators"

/* ============================================================
   Organismes
   ============================================================ */

export const ORGANISM_CATEGORIES = [
  "ministere",
  "direction_generale",
  "etablissement_public",
  "collectivite",
  "autorite",
  "institution",
] as const
export type OrganismCategory = (typeof ORGANISM_CATEGORIES)[number]
export const organismCategoryValidator = literals(...ORGANISM_CATEGORIES)

export const ORGANISM_STATUSES = [
  "active",
  "onboarding",
  "suspended",
] as const
export type OrganismStatus = (typeof ORGANISM_STATUSES)[number]
export const organismStatusValidator = literals(...ORGANISM_STATUSES)

export const ORGANISM_CONNECTIONS = [
  "api_sso",
  "portal",
  "none",
] as const
export type OrganismConnection = (typeof ORGANISM_CONNECTIONS)[number]
export const organismConnectionValidator = literals(...ORGANISM_CONNECTIONS)

/* ============================================================
   Provinces (référentiel constant)
   ============================================================ */

export const PROVINCE_CODES = [
  "estuaire",
  "haut_ogooue",
  "moyen_ogooue",
  "ngounie",
  "nyanga",
  "ogooue_ivindo",
  "ogooue_lolo",
  "ogooue_maritime",
  "woleu_ntem",
] as const
export type ProvinceCode = (typeof PROVINCE_CODES)[number]
export const provinceCodeValidator = literals(...PROVINCE_CODES)

/* ============================================================
   Agents — rôles et auth
   ============================================================ */

export const AGENT_ROLES = [
  "agent_instructeur",
  "agent_superviseur",
  "chef_service",
  "officier_signataire",
  "admin_organisme",
  "admin_technique",
  "platform_admin",
] as const
export type AgentRole = (typeof AGENT_ROLES)[number]
export const agentRoleValidator = literals(...AGENT_ROLES)

export const AUTH_METHODS = [
  "nip_only",
  "nip_carte_agent",
  "nip_cle_api",
] as const
export type AuthMethod = (typeof AUTH_METHODS)[number]
export const authMethodValidator = literals(...AUTH_METHODS)

/* ============================================================
   Citoyens
   ============================================================ */

export const SEXES = ["M", "F"] as const
export type Sex = (typeof SEXES)[number]
export const sexValidator = literals(...SEXES)

export const CIVIL_STATUSES = [
  "single",
  "married",
  "divorced",
  "widowed",
] as const
export type CivilStatus = (typeof CIVIL_STATUSES)[number]
export const civilStatusValidator = literals(...CIVIL_STATUSES)

export const CITIZEN_RELATION_KINDS = [
  "father",
  "mother",
  "spouse",
  "child",
  "sibling",
  "legal_guardian",
] as const
export type CitizenRelationKind = (typeof CITIZEN_RELATION_KINDS)[number]
export const citizenRelationKindValidator = literals(...CITIZEN_RELATION_KINDS)

/* ============================================================
   Services et variantes (ADR-0005)
   ============================================================ */

export const SERVICE_STATUSES = [
  "published",
  "draft",
  "archived",
] as const
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]
export const serviceStatusValidator = literals(...SERVICE_STATUSES)

export const SERVICE_DELIVERY_MODES = [
  "online",
  "hybrid",
  "in_person",
] as const
export type ServiceDeliveryMode = (typeof SERVICE_DELIVERY_MODES)[number]
export const serviceDeliveryModeValidator = literals(...SERVICE_DELIVERY_MODES)

export const REQUIREMENT_AUTOFILL_SOURCES = [
  "citizen_identity",
  "previous_request",
  "third_party_api",
  "none",
] as const
export type RequirementAutofillSource = (typeof REQUIREMENT_AUTOFILL_SOURCES)[number]
export const requirementAutofillSourceValidator = literals(...REQUIREMENT_AUTOFILL_SOURCES)

export const SERVICE_ARCHIVED_REASON_KINDS = [
  "replaced_by_other",
  "policy_change",
  "legal_obsolete",
  "other",
] as const
export type ServiceArchivedReasonKind = (typeof SERVICE_ARCHIVED_REASON_KINDS)[number]
export const serviceArchivedReasonKindValidator = literals(
  ...SERVICE_ARCHIVED_REASON_KINDS,
)

/* ============================================================
   Document templates et variables
   ============================================================ */

export const TEMPLATE_STATUSES = [
  "draft",
  "active",
  "deprecated",
] as const
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number]
export const templateStatusValidator = literals(...TEMPLATE_STATUSES)

export const TEMPLATE_VARIABLE_SOURCES = [
  "request_payload",
  "registry_entry",
  "citizen_profile",
  "organism_profile",
  "system",
  "fixed",
] as const
export type TemplateVariableSource = (typeof TEMPLATE_VARIABLE_SOURCES)[number]
export const templateVariableSourceValidator = literals(...TEMPLATE_VARIABLE_SOURCES)

/* ============================================================
   Demandes citoyennes (cycle de vie complet)
   ============================================================ */

export const REQUEST_STATUSES = [
  "draft",
  "submitted",
  "in_instruction",
  "waiting_pieces",
  "waiting_registry",
  "prepared",
  "to_sign",
  "issued",
  "rejected",
  "cancelled",
] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]
export const requestStatusValidator = literals(...REQUEST_STATUSES)

export const REQUEST_BENEFICIARY_KINDS = [
  "self",
  "third_party",
] as const
export type RequestBeneficiaryKind = (typeof REQUEST_BENEFICIARY_KINDS)[number]
export const requestBeneficiaryKindValidator = literals(...REQUEST_BENEFICIARY_KINDS)

/* ============================================================
   Pièces justificatives
   ============================================================ */

export const PIECE_STATUSES = [
  "missing",
  "uploading",
  "uploaded",
  "validated",
  "rejected",
] as const
export type PieceStatus = (typeof PIECE_STATUSES)[number]
export const pieceStatusValidator = literals(...PIECE_STATUSES)

export const PIECE_DOC_TYPES = [
  "cni",
  "passeport",
  "permis_conduire",
  "livret_famille",
  "acte_naissance",
  "acte_mariage",
  "acte_deces",
  "certificat_residence",
  "justif_domicile",
  "mandat",
  "attestation",
  "photo_identite",
  "autre",
] as const
export type PieceDocType = (typeof PIECE_DOC_TYPES)[number]
export const pieceDocTypeValidator = literals(...PIECE_DOC_TYPES)

/* ============================================================
   Vérifications automatiques (instruction)
   ============================================================ */

export const VERIFICATION_STATUSES = [
  "ok",
  "pending",
  "ko",
  "not_applicable",
] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]
export const verificationStatusValidator = literals(...VERIFICATION_STATUSES)

export const VERIFICATION_KINDS = [
  "identity",
  "data_consistency",
  "duplicate_detection",
  "ocr_quality",
  "antifraud",
  "registry_match",
  "third_party_lookup",
  "biometric",
] as const
export type VerificationKind = (typeof VERIFICATION_KINDS)[number]
export const verificationKindValidator = literals(...VERIFICATION_KINDS)

/* ============================================================
   Événements de demande (timeline + activité)
   ============================================================ */

export const REQUEST_EVENT_KINDS = [
  "submission",
  "seal",
  "assignment",
  "transfer",
  "verification",
  "piece_request",
  "piece_received",
  "piece_rejected",
  "status_change",
  "signature",
  "delivery",
  "message",
  "cancellation",
  "internal_note",
] as const
export type RequestEventKind = (typeof REQUEST_EVENT_KINDS)[number]
export const requestEventKindValidator = literals(...REQUEST_EVENT_KINDS)

export const ACTOR_KINDS = [
  "citizen",
  "agent",
  "organism",
  "system",
  "platform_admin",
] as const
export type ActorKind = (typeof ACTOR_KINDS)[number]
export const actorKindValidator = literals(...ACTOR_KINDS)

/* ============================================================
   Messages citoyen ↔ agent (ADR-0010)
   ============================================================ */

export const MESSAGE_FROM_KINDS = ["citizen", "agent"] as const
export type MessageFromKind = (typeof MESSAGE_FROM_KINDS)[number]
export const messageFromKindValidator = literals(...MESSAGE_FROM_KINDS)

/* ============================================================
   Documents émis (actes signés)
   ============================================================ */

export const DOCUMENT_STATUSES = [
  "draft",
  "prepared",
  "signed",
  "issued",
  "revoked",
] as const
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number]
export const documentStatusValidator = literals(...DOCUMENT_STATUSES)

export const PUBLIC_VERIFICATION_OUTCOMES = [
  "valid",
  "revoked",
  "unknown",
] as const
export type PublicVerificationOutcome = (typeof PUBLIC_VERIFICATION_OUTCOMES)[number]
export const publicVerificationOutcomeValidator = literals(...PUBLIC_VERIFICATION_OUTCOMES)

/* ============================================================
   Registre civil (ADR-0011)
   ============================================================ */

export const REGISTRY_ACCURACY_LEVELS = [
  "partial",
  "verified",
  "attested",
] as const
export type RegistryAccuracyLevel = (typeof REGISTRY_ACCURACY_LEVELS)[number]
export const registryAccuracyLevelValidator = literals(...REGISTRY_ACCURACY_LEVELS)

export const REGISTRY_KINDS = [
  "birth",
  "marriage",
  "death",
  "adoption",
  "recognition",
] as const
export type RegistryKind = (typeof REGISTRY_KINDS)[number]
export const registryKindValidator = literals(...REGISTRY_KINDS)

/* ============================================================
   Correspondance inter-administrations
   ============================================================ */

/**
 * Cycle de vie d'une correspondance (Bloc 5).
 *
 * Refonte vs v1 :
 *   - `pending_validation` → `pending_signature` (cohérent avec Bloc 3 qui
 *     parle de circuit "signature", pas "validation")
 *   - NOUVEAU `acknowledged` : AR formel reçu (distinct du simple "ouvert")
 *   - NOUVEAU `recalled` : rappel par l'expéditeur avant 1er AR
 */
export const CORRESPONDENCE_STATUSES = [
  "draft",
  "pending_signature",
  "sent",
  "acknowledged",
  "replied",
  "closed",
  "archived",
  "recalled",
] as const
export type CorrespondenceStatus = (typeof CORRESPONDENCE_STATUSES)[number]
export const correspondenceStatusValidator = literals(...CORRESPONDENCE_STATUSES)

/**
 * 4 niveaux de confidentialité (Bloc 5 — ajout de "secret" vs v1).
 * - public      : ouvert à tous (rare, ex. circulaire publique)
 * - restricted  : interne à l'administration
 * - confidential: limité aux destinataires + circuit hiérarchique
 * - secret      : secret défense ou équivalent (PJ chiffrées spécifiquement)
 */
export const CONFIDENTIALITY_LEVELS = [
  "public",
  "restricted",
  "confidential",
  "secret",
] as const
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number]
export const confidentialityLevelValidator = literals(...CONFIDENTIALITY_LEVELS)

/**
 * 16 kinds répartis en 6 familles (Bloc 5 §4).
 * Conditionnent les règles (circuit obligatoire, PJ obligatoire, DUA, délais)
 * stockées dans la table `correspondenceKindRules`.
 */
export const CORRESPONDENCE_KINDS = [
  // 1. Instruction (liée à un dossier en cours)
  "instruction_request",
  "instruction_transmission",
  "instruction_response",
  // 2. Décision (ouvre des délais de recours)
  "decision_grant",
  "decision_reject",
  "decision_suspend",
  // 3. Coopération (sans demande sous-jacente obligatoire)
  "cooperation_info_share",
  "cooperation_data_request",
  "cooperation_fraud_alert",
  // 4. Saisine / escalade
  "escalation_tutelle",
  "escalation_dispute",
  "escalation_incident",
  // 5. Gestion interne
  "internal_circular",
  "internal_service_note",
  // 6. Protocole
  "protocol_greeting",
  "protocol_condolences",
  // Fallback
  "other",
] as const
export type CorrespondenceKind = (typeof CORRESPONDENCE_KINDS)[number]
export const correspondenceKindValidator = literals(...CORRESPONDENCE_KINDS)

/** Rôle d'un destinataire dans une correspondance (modèle email). */
export const CORRESPONDENCE_RECIPIENT_ROLES = ["to", "cc", "bcc"] as const
export type CorrespondenceRecipientRole =
  (typeof CORRESPONDENCE_RECIPIENT_ROLES)[number]
export const correspondenceRecipientRoleValidator = literals(
  ...CORRESPONDENCE_RECIPIENT_ROLES,
)

/** Type d'émetteur/récepteur (polymorphe). */
export const CORRESPONDENCE_PARTY_KINDS = [
  "organism",
  "citizen",
  "external",
  "platform",
] as const
export type CorrespondencePartyKind =
  (typeof CORRESPONDENCE_PARTY_KINDS)[number]
export const correspondencePartyKindValidator = literals(
  ...CORRESPONDENCE_PARTY_KINDS,
)

/** Kind d'une partie externe (notaire, ambassade…). */
export const EXTERNAL_PARTY_KINDS = [
  "notary",
  "bailiff",
  "embassy",
  "court",
  "private_org",
  "other",
] as const
export type ExternalPartyKind = (typeof EXTERNAL_PARTY_KINDS)[number]
export const externalPartyKindValidator = literals(...EXTERNAL_PARTY_KINDS)

/** Origine d'une PJ (acte officiel vs PDF/image externe). */
export const CORRESPONDENCE_ATTACHMENT_KINDS = ["document", "external"] as const
export type CorrespondenceAttachmentKind =
  (typeof CORRESPONDENCE_ATTACHMENT_KINDS)[number]
export const correspondenceAttachmentKindValidator = literals(
  ...CORRESPONDENCE_ATTACHMENT_KINDS,
)

/** Format du corps d'un message. */
export const MESSAGE_BODY_FORMATS = ["plain", "markdown"] as const
export type MessageBodyFormat = (typeof MESSAGE_BODY_FORMATS)[number]
export const messageBodyFormatValidator = literals(...MESSAGE_BODY_FORMATS)

/** Émetteur d'un message dans le thread (3 cas — admin, citoyen, système). */
export const CORRESPONDENCE_MESSAGE_FROM_KINDS = [
  "agent",
  "citizen",
  "system",
] as const
export type CorrespondenceMessageFromKind =
  (typeof CORRESPONDENCE_MESSAGE_FROM_KINDS)[number]
export const correspondenceMessageFromKindValidator = literals(
  ...CORRESPONDENCE_MESSAGE_FROM_KINDS,
)

/** Statut d'un template de correspondance (pattern documentTemplates). */
export const CORRESPONDENCE_TEMPLATE_STATUSES = [
  "draft",
  "active",
  "deprecated",
] as const
export type CorrespondenceTemplateStatus =
  (typeof CORRESPONDENCE_TEMPLATE_STATUSES)[number]
export const correspondenceTemplateStatusValidator = literals(
  ...CORRESPONDENCE_TEMPLATE_STATUSES,
)

/* ============================================================
   Circuits de signature polymorphes (ADR-0009)
   ============================================================ */

export const SIGNATURE_SUBJECT_KINDS = [
  "document",
  "correspondence",
  "convention",
] as const
export type SignatureSubjectKind = (typeof SIGNATURE_SUBJECT_KINDS)[number]
export const signatureSubjectKindValidator = literals(...SIGNATURE_SUBJECT_KINDS)

export const SIGNATURE_CIRCUIT_STATUSES = [
  "pending",
  "active",
  "completed",
  "refused",
  "cancelled",
] as const
export type SignatureCircuitStatus = (typeof SIGNATURE_CIRCUIT_STATUSES)[number]
export const signatureCircuitStatusValidator = literals(...SIGNATURE_CIRCUIT_STATUSES)

export const SIGNATURE_STEP_STATUSES = [
  "pending",
  "active",
  "done",
  "refused",
  "skipped",
] as const
export type SignatureStepStatus = (typeof SIGNATURE_STEP_STATUSES)[number]
export const signatureStepStatusValidator = literals(...SIGNATURE_STEP_STATUSES)

/* ============================================================
   Archives SAE (NF Z42-013)
   ============================================================ */

export const ARCHIVE_STATUSES = [
  "active",
  "semi_active",
  "inactive",
  "archived_final",
  "scheduled_destruction",
  "destroyed",
] as const
export type ArchiveStatus = (typeof ARCHIVE_STATUSES)[number]
export const archiveStatusValidator = literals(...ARCHIVE_STATUSES)

export const FINAL_DISPOSITIONS = [
  "conservation_definitive",
  "elimination_logique",
  "elimination_physique",
  "tri",
] as const
export type FinalDisposition = (typeof FINAL_DISPOSITIONS)[number]
export const finalDispositionValidator = literals(...FINAL_DISPOSITIONS)

export const ELIMINATION_BATCH_STATUSES = [
  "draft",
  "pending_dgan_visa",
  "visa_approved",
  "visa_refused",
  "executed",
] as const
export type EliminationBatchStatus = (typeof ELIMINATION_BATCH_STATUSES)[number]
export const eliminationBatchStatusValidator = literals(...ELIMINATION_BATCH_STATUSES)

export const INTEGRITY_CHECK_OUTCOMES = [
  "ok",
  "failed",
  "pending",
] as const
export type IntegrityCheckOutcome = (typeof INTEGRITY_CHECK_OUTCOMES)[number]
export const integrityCheckOutcomeValidator = literals(...INTEGRITY_CHECK_OUTCOMES)

/* ============================================================
   Onboarding d'un organisme (P3)
   ============================================================ */

export const ONBOARDING_STEP_KEYS = [
  "identification",
  "referents",
  "habilitations",
  "convention",
  "services_catalog",
  "integration_tests",
  "production",
] as const
export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number]
export const onboardingStepKeyValidator = literals(...ONBOARDING_STEP_KEYS)

export const ONBOARDING_STEP_STATUSES = [
  "pending",
  "active",
  "done",
  "blocked",
] as const
export type OnboardingStepStatus = (typeof ONBOARDING_STEP_STATUSES)[number]
export const onboardingStepStatusValidator = literals(...ONBOARDING_STEP_STATUSES)

export const CONVENTION_STATUSES = [
  "draft",
  "pending_signature",
  "signed",
  "expired",
] as const
export type ConventionStatus = (typeof CONVENTION_STATUSES)[number]
export const conventionStatusValidator = literals(...CONVENTION_STATUSES)

/* ============================================================
   Notifications unifiées (ADR-0008)
   ============================================================ */

export const NOTIFICATION_RECIPIENT_KINDS = [
  "citizen",
  "agent",
  "platform_admin",
] as const
export type NotificationRecipientKind = (typeof NOTIFICATION_RECIPIENT_KINDS)[number]
export const notificationRecipientKindValidator = literals(...NOTIFICATION_RECIPIENT_KINDS)

export const NOTIFICATION_KINDS = [
  // citoyen
  "request_status_change",
  "piece_requested",
  "document_ready",
  "message_received",
  // agent
  "assignment",
  "transfer_received",
  "signature_requested",
  "deadline_approaching",
  // plateforme
  "system_maintenance",
  "infra_degraded",
  "org_slo_breach",
  "stat_anomaly",
  "security_alert",
  "onboarding_update",
  // transverse
  "service_published",
  // Bloc 5 — Correspondance
  "correspondence_received",
  "correspondence_acknowledged",
  "correspondence_replied",
  "correspondence_recalled",
  "correspondence_deadline_approaching",
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]
export const notificationKindValidator = literals(...NOTIFICATION_KINDS)

export const NOTIFICATION_SEVERITIES = [
  "info",
  "warning",
  "danger",
  "success",
] as const
export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number]
export const notificationSeverityValidator = literals(...NOTIFICATION_SEVERITIES)

/**
 * Canaux de distribution gérés par `NotificationProvider` (Phase Trous A).
 * `in_app` est toujours actif (insert dans `notifications`). Les canaux
 * externes (`email`, `sms`) passent par `notificationOutbox` qui sera
 * vidé par des actions Node (skeleton v1, dispatch effectif Phase 2).
 */
export const NOTIFICATION_CHANNELS = [
  "in_app",
  "email",
  "sms",
] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
export const notificationChannelValidator = literals(...NOTIFICATION_CHANNELS)

export const NOTIFICATION_OUTBOX_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped",
] as const
export type NotificationOutboxStatus =
  (typeof NOTIFICATION_OUTBOX_STATUSES)[number]
export const notificationOutboxStatusValidator = literals(
  ...NOTIFICATION_OUTBOX_STATUSES,
)

/* ============================================================
   Infrastructure et supervision plateforme
   ============================================================ */

export const COMPONENT_STATUSES = [
  "ok",
  "degraded",
  "down",
  "maintenance",
] as const
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number]
export const componentStatusValidator = literals(...COMPONENT_STATUSES)

/* ============================================================
   Habilitations sur dossiers (A4)
   ============================================================ */

export const DOSSIER_ACCESS_LEVELS = [
  "read",
  "read_write",
  "read_subset",
] as const
export type DossierAccessLevel = (typeof DOSSIER_ACCESS_LEVELS)[number]
export const dossierAccessLevelValidator = literals(...DOSSIER_ACCESS_LEVELS)

/* ============================================================
   Audit log et activité d'équipe (ADR-0012)
   ============================================================ */

export const AUDIT_VERBS = [
  "request.submit",
  "request.assign",
  "request.transfer",
  "request.cancel",
  "request.reject",
  "piece.upload",
  "piece.validate",
  "piece.reject",
  "verification.run",
  "registry.match_confirmed",
  "document.prepare",
  "document.sign",
  "document.issue",
  "document.revoke",
  "correspondence.send",
  "correspondence.reply",
  "archive.verse",
  "archive.eliminate",
  "elimination_batch.submit_visa",
  "elimination_batch.execute",
  "organism.register",
  "organism.activate",
  "organism.suspend",
  "service.created",
  "service.updated",
  "service.published",
  "service.unpublished",
  "service.archived",
  "service.duplicated",
  "service.variant_added",
  "service.variant_updated",
  "service.variants_reordered",
  "service.default_variant_set",
  "service.variant_deleted",
  "service.requirement_added",
  "service.requirement_updated",
  "service.requirements_reordered",
  "service.requirement_deleted",
  "service.template_drafted",
  "service.template_validated",
  "service.template_activated",
  "service.template_var_added",
  "service.template_var_updated",
  "service.template_var_deleted",
  // Legacy (conservés pour compat — à supprimer plus tard)
  "service.publish",
  "service.archive",
  "convention.sign",
  "access.grant",
  "access.revoke",
  "agent.create",
  "agent.role_change",
  "auth.login",
  "auth.logout",
  // Phase Trous B — gestion d'équipe
  "agent.invite",
  "agent.invite_revoke",
  "agent.invite_accept",
  "agent.disable",
  "agent.enable",
] as const
export type AuditVerb = (typeof AUDIT_VERBS)[number]
export const auditVerbValidator = literals(...AUDIT_VERBS)

/* ============================================================
   Recommandations citoyen (C3)
   ============================================================ */

export const RECOMMENDATION_REASONS = [
  "expiring_document",
  "life_event",
  "popular_similar_profile",
  "follow_up_required",
  "address_change_detected",
] as const
export type RecommendationReason = (typeof RECOMMENDATION_REASONS)[number]
export const recommendationReasonValidator = literals(...RECOMMENDATION_REASONS)

/* ============================================================
   Items sauvegardés citoyen (C2)
   ============================================================ */

export const SAVED_ITEM_KINDS = [
  "service",
  "administration",
  "draft_request",
] as const
export type SavedItemKind = (typeof SAVED_ITEM_KINDS)[number]
export const savedItemKindValidator = literals(...SAVED_ITEM_KINDS)

/* ============================================================
   Assistant IA
   ============================================================ */

export const CONVERSATION_PRINCIPAL_KINDS = [
  "citizen",
  "agent",
  "platform_admin",
] as const
export type ConversationPrincipalKind = (typeof CONVERSATION_PRINCIPAL_KINDS)[number]
export const conversationPrincipalKindValidator = literals(...CONVERSATION_PRINCIPAL_KINDS)

export const CONVERSATION_TRANSPORTS = [
  "text",
  "audio",
  "mixed",
] as const
export type ConversationTransport = (typeof CONVERSATION_TRANSPORTS)[number]
export const conversationTransportValidator = literals(...CONVERSATION_TRANSPORTS)

export const MESSAGE_ROLES = [
  "user",
  "assistant",
  "system",
] as const
export type MessageRole = (typeof MESSAGE_ROLES)[number]
export const messageRoleValidator = literals(...MESSAGE_ROLES)
