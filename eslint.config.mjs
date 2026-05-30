import js from "@eslint/js"
import tseslint from "typescript-eslint"

/**
 * Config ESLint partagée du monorepo (flat config, ESLint v9).
 *
 * Points clés :
 *  - typescript-eslint `recommended` partout (syntaxique, rapide).
 *  - `no-floating-promises` typé sur le backend Convex : les opérations DB
 *    sont async, une promise non-awaitée = bug silencieux.
 *  - Garde-fou « identité en argument » : interdit d'accepter idnSub/userId/…
 *    comme argument de fonction Convex pour autoriser (cf. CLAUDE.md, règle 2).
 *    L'identité doit venir de `ctx.auth.getUserIdentity()`.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/dist/**",
      "**/_generated/**",
      "tests-e2e/**",
      "**/*.config.{js,mjs,ts}",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Linting introduit sur une base existante : le code mort pré-existant
  // est signalé (warn) sans bloquer la CI. Les `_`-prefixés sont volontaires.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },

  // --- Backend Convex : règles typées + garde-fou identité ---
  {
    files: ["packages/backend/convex/**/*.ts"],
    ignores: ["**/*.test.ts", "**/test.setup.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "no-restricted-syntax": [
        "warn",
        {
          // ex. `args: { idnSub: v.string() }` — identité fournie par l'appelant
          selector:
            "Property[key.name=/^(idnSub|userId|actorSub|adminSub|callerSub)$/][value.type='CallExpression'][value.callee.object.name='v']",
          message:
            "Ne pas accepter d'identité (idnSub/userId/…) en argument pour autoriser. Dériver l'identité via ctx.auth.getUserIdentity(). Voir CLAUDE.md (règle 2).",
        },
      ],
    },
  },
)
