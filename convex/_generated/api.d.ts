/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as complaints from "../complaints.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as notices from "../notices.js";
import type * as payments from "../payments.js";
import type * as polls from "../polls.js";
import type * as properties from "../properties.js";
import type * as residents from "../residents.js";
import type * as services from "../services.js";
import type * as staff from "../staff.js";
import type * as threads from "../threads.js";
import type * as users from "../users.js";
import type * as visitors from "../visitors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  auth: typeof auth;
  complaints: typeof complaints;
  events: typeof events;
  http: typeof http;
  notices: typeof notices;
  payments: typeof payments;
  polls: typeof polls;
  properties: typeof properties;
  residents: typeof residents;
  services: typeof services;
  staff: typeof staff;
  threads: typeof threads;
  users: typeof users;
  visitors: typeof visitors;
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
