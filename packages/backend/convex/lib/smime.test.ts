/**
 * Tests du stub S/MIME (Bloc 5).
 *
 * Le stub doit :
 *   - produire une fingerprint déterministe pour les mêmes inputs
 *   - vérifier OK quand fingerprint matche
 *   - vérifier KO quand body modifié
 *   - vérifier KO quand fingerprint mal formée
 */
import { describe, expect, test } from "vitest"
import { signMessage, verifySignature, SMIME_STUB_ALGORITHM } from "./smime"
import type { Id } from "../_generated/dataModel"

const fakeAgentId = "agt_abc123" as unknown as Id<"agents">

describe("smime stub", () => {
  test("signMessage produit fingerprint hex 64 chars + algorithm défini", async () => {
    const sig = await signMessage({
      body: "Bonjour Madame",
      agentId: fakeAgentId,
      sentAt: 1_700_000_000_000,
    })
    expect(sig.signatureFingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(sig.signatureAlgorithm).toBe(SMIME_STUB_ALGORITHM)
    expect(sig.signedAt).toBe(1_700_000_000_000)
  })

  test("déterministe : mêmes inputs → même fingerprint", async () => {
    const a = await signMessage({
      body: "X",
      agentId: fakeAgentId,
      sentAt: 42,
    })
    const b = await signMessage({
      body: "X",
      agentId: fakeAgentId,
      sentAt: 42,
    })
    expect(a.signatureFingerprint).toBe(b.signatureFingerprint)
  })

  test("verifySignature OK si inputs identiques", async () => {
    const sig = await signMessage({
      body: "Test",
      agentId: fakeAgentId,
      sentAt: 100,
    })
    const ok = await verifySignature({
      body: "Test",
      agentId: fakeAgentId,
      sentAt: 100,
      fingerprint: sig.signatureFingerprint,
    })
    expect(ok).toBe(true)
  })

  test("verifySignature KO si body modifié", async () => {
    const sig = await signMessage({
      body: "Original",
      agentId: fakeAgentId,
      sentAt: 100,
    })
    expect(
      await verifySignature({
        body: "Modifié",
        agentId: fakeAgentId,
        sentAt: 100,
        fingerprint: sig.signatureFingerprint,
      }),
    ).toBe(false)
  })

  test("verifySignature KO si fingerprint mal formée", async () => {
    expect(
      await verifySignature({
        body: "x",
        agentId: fakeAgentId,
        sentAt: 1,
        fingerprint: "trop_court",
      }),
    ).toBe(false)
    expect(
      await verifySignature({
        body: "x",
        agentId: fakeAgentId,
        sentAt: 1,
        fingerprint: "",
      }),
    ).toBe(false)
  })

  test("verifySignature KO si sentAt modifié (anti-replay)", async () => {
    const sig = await signMessage({
      body: "Test",
      agentId: fakeAgentId,
      sentAt: 100,
    })
    expect(
      await verifySignature({
        body: "Test",
        agentId: fakeAgentId,
        sentAt: 200, // différent
        fingerprint: sig.signatureFingerprint,
      }),
    ).toBe(false)
  })
})
