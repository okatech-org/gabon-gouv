/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_archives from "../admin/archives.js";
import type * as admin_citizens from "../admin/citizens.js";
import type * as admin_correspondence from "../admin/correspondence.js";
import type * as admin_dashboard from "../admin/dashboard.js";
import type * as admin_directory from "../admin/directory.js";
import type * as admin_documentTemplates from "../admin/documentTemplates.js";
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_requests from "../admin/requests.js";
import type * as admin_serviceRequirements from "../admin/serviceRequirements.js";
import type * as admin_serviceVariants from "../admin/serviceVariants.js";
import type * as admin_services from "../admin/services.js";
import type * as admin_signatures from "../admin/signatures.js";
import type * as admin_team from "../admin/team.js";
import type * as aggregates from "../aggregates.js";
import type * as auth from "../auth.js";
import type * as citizen_auth from "../citizen/auth.js";
import type * as citizen_catalog from "../citizen/catalog.js";
import type * as citizen_dashboard from "../citizen/dashboard.js";
import type * as citizen_directory from "../citizen/directory.js";
import type * as citizen_documents from "../citizen/documents.js";
import type * as citizen_dossier from "../citizen/dossier.js";
import type * as citizen_drafts from "../citizen/drafts.js";
import type * as citizen_home from "../citizen/home.js";
import type * as citizen_identity from "../citizen/identity.js";
import type * as citizen_messages from "../citizen/messages.js";
import type * as citizen_profile from "../citizen/profile.js";
import type * as citizen_requests from "../citizen/requests.js";
import type * as citizen_uploads from "../citizen/uploads.js";
import type * as health from "../health.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_enums from "../lib/enums.js";
import type * as lib_issuance from "../lib/issuance.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_signatureCircuit from "../lib/signatureCircuit.js";
import type * as lib_triggers from "../lib/triggers.js";
import type * as platform_auth from "../platform/auth.js";
import type * as platform_catalog from "../platform/catalog.js";
import type * as platform_citizens from "../platform/citizens.js";
import type * as platform_infrastructure from "../platform/infrastructure.js";
import type * as platform_onboarding from "../platform/onboarding.js";
import type * as platform_organisms from "../platform/organisms.js";
import type * as platform_security from "../platform/security.js";
import type * as platform_stats from "../platform/stats.js";
import type * as platform_supervision from "../platform/supervision.js";
import type * as schema_archives from "../schema/archives.js";
import type * as schema_assistant from "../schema/assistant.js";
import type * as schema_audit from "../schema/audit.js";
import type * as schema_auth from "../schema/auth.js";
import type * as schema_citizens from "../schema/citizens.js";
import type * as schema_correspondence from "../schema/correspondence.js";
import type * as schema_documents from "../schema/documents.js";
import type * as schema_notifications from "../schema/notifications.js";
import type * as schema_organisms from "../schema/organisms.js";
import type * as schema_requests from "../schema/requests.js";
import type * as schema_services from "../schema/services.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/archives": typeof admin_archives;
  "admin/citizens": typeof admin_citizens;
  "admin/correspondence": typeof admin_correspondence;
  "admin/dashboard": typeof admin_dashboard;
  "admin/directory": typeof admin_directory;
  "admin/documentTemplates": typeof admin_documentTemplates;
  "admin/mutations": typeof admin_mutations;
  "admin/requests": typeof admin_requests;
  "admin/serviceRequirements": typeof admin_serviceRequirements;
  "admin/serviceVariants": typeof admin_serviceVariants;
  "admin/services": typeof admin_services;
  "admin/signatures": typeof admin_signatures;
  "admin/team": typeof admin_team;
  aggregates: typeof aggregates;
  auth: typeof auth;
  "citizen/auth": typeof citizen_auth;
  "citizen/catalog": typeof citizen_catalog;
  "citizen/dashboard": typeof citizen_dashboard;
  "citizen/directory": typeof citizen_directory;
  "citizen/documents": typeof citizen_documents;
  "citizen/dossier": typeof citizen_dossier;
  "citizen/drafts": typeof citizen_drafts;
  "citizen/home": typeof citizen_home;
  "citizen/identity": typeof citizen_identity;
  "citizen/messages": typeof citizen_messages;
  "citizen/profile": typeof citizen_profile;
  "citizen/requests": typeof citizen_requests;
  "citizen/uploads": typeof citizen_uploads;
  health: typeof health;
  "lib/audit": typeof lib_audit;
  "lib/enums": typeof lib_enums;
  "lib/issuance": typeof lib_issuance;
  "lib/permissions": typeof lib_permissions;
  "lib/signatureCircuit": typeof lib_signatureCircuit;
  "lib/triggers": typeof lib_triggers;
  "platform/auth": typeof platform_auth;
  "platform/catalog": typeof platform_catalog;
  "platform/citizens": typeof platform_citizens;
  "platform/infrastructure": typeof platform_infrastructure;
  "platform/onboarding": typeof platform_onboarding;
  "platform/organisms": typeof platform_organisms;
  "platform/security": typeof platform_security;
  "platform/stats": typeof platform_stats;
  "platform/supervision": typeof platform_supervision;
  "schema/archives": typeof schema_archives;
  "schema/assistant": typeof schema_assistant;
  "schema/audit": typeof schema_audit;
  "schema/auth": typeof schema_auth;
  "schema/citizens": typeof schema_citizens;
  "schema/correspondence": typeof schema_correspondence;
  "schema/documents": typeof schema_documents;
  "schema/notifications": typeof schema_notifications;
  "schema/organisms": typeof schema_organisms;
  "schema/requests": typeof schema_requests;
  "schema/services": typeof schema_services;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  aggCitizensGlobal: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggCitizensGlobal">;
  aggRequestsGlobal: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggRequestsGlobal">;
  aggDocumentsGlobal: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggDocumentsGlobal">;
  aggArchivesGlobal: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggArchivesGlobal">;
  aggRequestsByOrg: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggRequestsByOrg">;
  aggDocumentsByOrg: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggDocumentsByOrg">;
  aggRequestsByOrgStatus: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggRequestsByOrgStatus">;
  aggArchivesByOrgStatus: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggArchivesByOrgStatus">;
  aggRequestsByOrgAgent: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggRequestsByOrgAgent">;
  aggRequestsByService: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggRequestsByService">;
  aggRequestsByServiceVariant: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggRequestsByServiceVariant">;
  aggOrgsByStatus: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggOrgsByStatus">;
  aggNotifsUnread: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggNotifsUnread">;
};
