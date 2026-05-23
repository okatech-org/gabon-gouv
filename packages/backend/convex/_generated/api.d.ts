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
import type * as admin_mutations from "../admin/mutations.js";
import type * as admin_requests from "../admin/requests.js";
import type * as admin_services from "../admin/services.js";
import type * as auth from "../auth.js";
import type * as health from "../health.js";
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
  "admin/mutations": typeof admin_mutations;
  "admin/requests": typeof admin_requests;
  "admin/services": typeof admin_services;
  auth: typeof auth;
  health: typeof health;
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

export declare const components: {};
