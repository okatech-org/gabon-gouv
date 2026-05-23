/// <reference types="vite/client" />
/**
 * Charge les modules Convex pour convex-test.
 * Combine le code TS applicatif + les modules JS générés sous _generated.
 */
export const modules = {
  ...import.meta.glob("./**/*.ts"),
  ...import.meta.glob("./_generated/*.js"),
}
