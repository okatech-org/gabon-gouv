"use node"

/**
 * Action Node qui génère le PDF d'un document émis, calcule son sha256
 * réel, stocke les bytes dans Convex storage et patche le document.
 *
 * Appelée en `scheduler.runAfter(0, ...)` depuis `finalizeIssuance`
 * (lib/issuance.ts) pour ne pas bloquer la mutation principale.
 *
 * Tant que cette action n'a pas tourné, `document.pdfStorageKey` est
 * `undefined` et l'UI affiche « PDF en cours de génération ». Pour les
 * cas exceptionnels où l'action échoue (timeout @react-pdf, bytes
 * malformés), le document reste émis mais sans PDF — on peut relancer
 * manuellement via le même endpoint.
 *
 * Pourquoi une action Node : `@react-pdf/renderer` utilise des APIs Node
 * (Buffer, stream, fs lookups internes). En runtime V8 standard, il
 * échouerait.
 */

import { v } from "convex/values"
import { createHash } from "node:crypto"
import { internalAction } from "../_generated/server"
import { api, internal } from "../_generated/api"
import { renderActePdfBytes } from "./render"

export const generateDocumentPdf = internalAction({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    // 1. Charger le doc + contexte via une query interne dédiée. On évite
    //    de faire 4 ctx.runQuery distincts (atomicité de lecture).
    const ctxData = await ctx.runQuery(
      api.admin.documents.getRenderContext,
      { documentId },
    )
    if (!ctxData) {
      // Document supprimé entre temps — silencieux.
      return { skipped: true as const, reason: "document_not_found" }
    }
    if (ctxData.pdfAlreadyGenerated) {
      return { skipped: true as const, reason: "already_generated" }
    }

    // 2. Rendu PDF
    const bytes = await renderActePdfBytes({
      actNumber: ctxData.actNumber,
      title: ctxData.title,
      organismName: ctxData.organismName,
      category: ctxData.category,
      issuedAt: ctxData.issuedAt,
      verificationCode: ctxData.verificationCode,
      sha256Short: "calcul en cours", // remplacé après hash, mais le PDF
      // contient le hash en bas → on doit re-rendre une fois qu'on connaît
      // le hash final. Pour v1, on hash directement les bytes du PDF qui
      // contient une chaîne placeholder. C'est cohérent : le hash certifie
      // l'INTÉGRITÉ du PDF distribué, pas le hash d'un autre payload.
      legalReference: ctxData.legalReference,
      payload: ctxData.payload as Record<string, unknown>,
      signatoryName: ctxData.signatoryName,
    })

    // 3. sha256 des bytes
    const sha256 = createHash("sha256").update(bytes).digest("hex")

    // 4. Store dans Convex storage. ctx.storage.store accepte Blob.
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" })
    const storageId = await ctx.storage.store(blob)

    // 5. Patch document (mutation interne)
    await ctx.runMutation(internal.admin.documents.applyPdfResult, {
      documentId,
      pdfStorageKey: storageId,
      sha256,
      sizeBytes: bytes.byteLength,
    })

    return {
      skipped: false as const,
      pdfStorageKey: storageId,
      sha256,
      sizeBytes: bytes.byteLength,
    }
  },
})
